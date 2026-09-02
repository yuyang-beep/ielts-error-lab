import type { AnalysisDraft, MistakeRecord, NormalizedMistake } from "./types";
import { PROMPT_VERSION, TAXONOMY_VERSION } from "./taxonomy";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    file_hash TEXT NOT NULL,
    file_name TEXT NOT NULL,
    module TEXT NOT NULL CHECK(module IN ('reading','listening')),
    source_url TEXT,
    imported_at TEXT NOT NULL,
    stats_json TEXT NOT NULL DEFAULT '{}'
  )`,
  "CREATE INDEX IF NOT EXISTS idx_import_batches_hash ON import_batches(file_hash)",
  `CREATE TABLE IF NOT EXISTS import_rows (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    row_fingerprint TEXT NOT NULL,
    raw_snapshot_json TEXT NOT NULL,
    normalized_json TEXT NOT NULL,
    warnings_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(batch_id, row_fingerprint)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_import_rows_fingerprint ON import_rows(row_fingerprint)",
  `CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    source_label TEXT NOT NULL,
    question_text TEXT NOT NULL,
    evidence_context TEXT NOT NULL,
    source_analysis TEXT NOT NULL DEFAULT '',
    correct_answer TEXT NOT NULL,
    source_parts_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    import_row_id TEXT NOT NULL REFERENCES import_rows(id) ON DELETE CASCADE,
    attempted_on TEXT,
    attempted_on_raw TEXT NOT NULL,
    date_inferred INTEGER NOT NULL DEFAULT 0,
    user_answer TEXT,
    answer_state TEXT NOT NULL,
    source_note TEXT NOT NULL,
    source_tags_json TEXT NOT NULL,
    source_url TEXT,
    created_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id)",
  `CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL UNIQUE REFERENCES attempts(id) ON DELETE CASCADE,
    ai_draft_json TEXT NOT NULL,
    confirmed_json TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    taxonomy_version TEXT NOT NULL,
    confidence REAL NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('confirmed')),
    confirmed_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_analyses_confirmed ON analyses(confirmed_at)"
];

let initialized: Promise<void> | null = null;

export function ensureSchema(db: D1Database): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      await db.batch(schemaStatements.map((sql) => db.prepare(sql)));
      const columns = await db.prepare("PRAGMA table_info(questions)").all<{ name: string }>();
      if (!columns.results.some((column) => column.name === "source_analysis")) {
        await db.prepare("ALTER TABLE questions ADD COLUMN source_analysis TEXT NOT NULL DEFAULT ''").run();
      }
    })();
  }
  return initialized;
}

export async function confirmAnalyses(
  db: D1Database,
  items: Array<{
    row: NormalizedMistake;
    draft: AnalysisDraft;
    source_url: string;
    file_name: string;
    file_hash: string;
    force_new_attempt?: boolean;
  }>,
  model: string
) {
  await ensureSchema(db);
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  let inserted = 0;
  let skipped = 0;
  for (const item of items) {
    const suffix = item.force_new_attempt ? crypto.randomUUID().replaceAll("-", "") : item.row.row_fingerprint.slice(0, 32);
    const batchId = item.force_new_attempt
      ? `batch_${crypto.randomUUID()}`
      : `batch_${item.file_hash.slice(0, 32)}`;
    const importRowId = `row_${suffix}`;
    const questionId = `question_${item.row.question_fingerprint.slice(0, 32)}`;
    const attemptId = `attempt_${suffix}`;
    const analysisId = `analysis_${suffix}`;
    if (!item.force_new_attempt) {
      const existing = await db.prepare("SELECT id FROM analyses WHERE id = ?").bind(analysisId).first();
      if (existing) { skipped += 1; continue; }
    }
    statements.push(
      db.prepare(`INSERT OR IGNORE INTO import_batches
        (id,file_hash,file_name,module,source_url,imported_at,stats_json) VALUES (?,?,?,?,?,?,?)`)
        .bind(batchId, item.file_hash, item.file_name, item.row.module, item.source_url || null, now, JSON.stringify({ confirmed: 1 })),
      db.prepare(`INSERT OR IGNORE INTO import_rows
        (id,batch_id,row_number,row_fingerprint,raw_snapshot_json,normalized_json,warnings_json,created_at)
        VALUES (?,?,?,?,?,?,?,?)`)
        .bind(importRowId, batchId, item.row.row_number, item.row.row_fingerprint,
          JSON.stringify({
            日期: item.row.attempted_on_raw, 题号: item.row.source_label, 题目: item.row.question_text,
            原文: item.row.evidence_context, 解析: item.row.source_analysis, 笔记: item.row.source_note, 笔记内容标签: item.row.source_tags,
            我的答案: item.row.user_answer, 正确答案: item.row.correct_answer
          }), JSON.stringify(item.row), JSON.stringify(item.row.warnings), now),
      db.prepare(`INSERT INTO questions
        (id,fingerprint,module,source_label,question_text,evidence_context,source_analysis,correct_answer,source_parts_json,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(fingerprint) DO UPDATE SET source_analysis =
          CASE WHEN LENGTH(excluded.source_analysis) > 0 THEN excluded.source_analysis ELSE questions.source_analysis END`)
        .bind(questionId, item.row.question_fingerprint, item.row.module, item.row.source_label,
          item.row.question_text, item.row.evidence_context, item.row.source_analysis, item.row.correct_answer,
          JSON.stringify(item.row.source_parts), now),
      db.prepare(`INSERT INTO attempts
        (id,question_id,import_row_id,attempted_on,attempted_on_raw,date_inferred,user_answer,answer_state,
         source_note,source_tags_json,source_url,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(attemptId, questionId, importRowId, item.row.attempted_on, item.row.attempted_on_raw,
          item.row.date_inferred ? 1 : 0, item.row.user_answer, item.row.answer_state, item.row.source_note,
          JSON.stringify(item.row.source_tags), item.source_url || null, now),
      db.prepare(`INSERT INTO analyses
        (id,attempt_id,ai_draft_json,confirmed_json,model,prompt_version,taxonomy_version,confidence,status,confirmed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .bind(analysisId, attemptId, JSON.stringify(item.draft), JSON.stringify(item.draft), model,
          PROMPT_VERSION, TAXONOMY_VERSION, item.draft.confidence, "confirmed", now)
    );
    inserted += 1;
  }
  if (statements.length) await db.batch(statements);
  return { inserted, skipped };
}

function parseJson<T>(value: unknown, fallback: T): T {
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}

export async function listMistakes(
  db: D1Database,
  filters: { module?: string; question_type?: string; cause?: string; search?: string }
): Promise<MistakeRecord[]> {
  await ensureSchema(db);
  const where: string[] = [];
  const bindings: unknown[] = [];
  if (filters.module) { where.push("q.module = ?"); bindings.push(filters.module); }
  if (filters.search) {
    where.push("(q.question_text LIKE ? OR q.source_label LIKE ?)");
    bindings.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  const sql = `SELECT a.id, a.attempt_id, q.module, q.source_label, q.question_text, q.evidence_context, q.source_analysis,
    at.user_answer, q.correct_answer, at.attempted_on, at.source_note, at.source_tags_json, at.source_url,
    a.confirmed_json, a.confirmed_at
    FROM analyses a JOIN attempts at ON at.id=a.attempt_id JOIN questions q ON q.id=at.question_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY COALESCE(at.attempted_on, a.confirmed_at) DESC, a.confirmed_at DESC LIMIT 500`;
  const result = await db.prepare(sql).bind(...bindings).all<Record<string, unknown>>();
  return result.results.map((record) => {
    const analysis = parseJson<AnalysisDraft>(record.confirmed_json, {} as AnalysisDraft);
    return {
      id: String(record.id), attempt_id: String(record.attempt_id), module: record.module as "reading" | "listening",
      source_label: String(record.source_label), question_text: String(record.question_text),
      evidence_context: String(record.evidence_context), source_analysis: typeof record.source_analysis === "string" ? record.source_analysis : "", user_answer: typeof record.user_answer === "string" ? record.user_answer : null,
      correct_answer: String(record.correct_answer), attempted_on: typeof record.attempted_on === "string" ? record.attempted_on : null,
      source_note: String(record.source_note), source_tags: parseJson(record.source_tags_json, []),
      source_url: typeof record.source_url === "string" ? record.source_url : null, ...analysis, confirmed_at: String(record.confirmed_at)
    };
  }).filter((item) =>
    (!filters.question_type || item.question_type === filters.question_type) &&
    (!filters.cause || item.primary_cause === filters.cause || item.secondary_causes.includes(filters.cause))
  );
}

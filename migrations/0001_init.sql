-- The application runs the same idempotent schema in lib/db.ts so first use is safe.
-- This migration is retained for review, local D1 tooling, and future schema evolution.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY, file_hash TEXT NOT NULL, file_name TEXT NOT NULL,
  module TEXT NOT NULL CHECK(module IN ('reading','listening')), source_url TEXT,
  imported_at TEXT NOT NULL, stats_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_import_batches_hash ON import_batches(file_hash);

CREATE TABLE IF NOT EXISTS import_rows (
  id TEXT PRIMARY KEY, batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL, row_fingerprint TEXT NOT NULL, raw_snapshot_json TEXT NOT NULL,
  normalized_json TEXT NOT NULL, warnings_json TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(batch_id, row_fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_import_rows_fingerprint ON import_rows(row_fingerprint);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE, module TEXT NOT NULL,
  source_label TEXT NOT NULL, question_text TEXT NOT NULL, evidence_context TEXT NOT NULL,
  correct_answer TEXT NOT NULL, source_parts_json TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  import_row_id TEXT NOT NULL REFERENCES import_rows(id) ON DELETE CASCADE, attempted_on TEXT,
  attempted_on_raw TEXT NOT NULL, date_inferred INTEGER NOT NULL DEFAULT 0, user_answer TEXT,
  answer_state TEXT NOT NULL, source_note TEXT NOT NULL, source_tags_json TEXT NOT NULL,
  source_url TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL UNIQUE REFERENCES attempts(id) ON DELETE CASCADE,
  ai_draft_json TEXT NOT NULL, confirmed_json TEXT NOT NULL, model TEXT NOT NULL,
  prompt_version TEXT NOT NULL, taxonomy_version TEXT NOT NULL, confidence REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('confirmed')), confirmed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analyses_confirmed ON analyses(confirmed_at);

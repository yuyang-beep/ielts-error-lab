import type { AnalysisDraft, MistakeRecord, PendingAnalysis, VocabularyEntry } from "./types";

const DB_NAME = "ielts-error-lab-local";
const STORE_NAME = "mistakes";
type StoredMistake = MistakeRecord & { owner_key: string; storage_key: string };

function ownerKey(value: string): string {
  return value.trim().toLowerCase() || "anonymous";
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("当前浏览器不支持本地数据库，请更新浏览器后重试"));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "storage_key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("本地数据库打开失败"));
  });
}

function toRecord(item: PendingAnalysis): MistakeRecord {
  return {
    id: `local_${crypto.randomUUID()}`,
    attempt_id: `attempt_${crypto.randomUUID()}`,
    client_id: item.row.client_id,
    row_fingerprint: item.row.row_fingerprint,
    module: item.row.module,
    source_label: item.row.source_label,
    question_text: item.row.question_text,
    evidence_context: item.row.evidence_context,
    source_analysis: item.row.source_analysis,
    user_answer: item.row.user_answer,
    correct_answer: item.row.correct_answer,
    attempted_on: item.row.attempted_on,
    source_note: item.row.source_note,
    source_tags: item.row.source_tags,
    source_url: item.source_url || null,
    question_type: item.draft.question_type,
    primary_cause: item.draft.primary_cause,
    secondary_causes: item.draft.secondary_causes,
    answer_comparison: item.draft.answer_comparison,
    evidence_span: item.draft.evidence_span,
    trap_mechanism: item.draft.trap_mechanism,
    diagnostic_question: item.draft.diagnostic_question,
    confidence: item.draft.confidence,
    provenance: ["user_confirmation"],
    vocabulary: item.draft.vocabulary ?? [],
    confirmed_at: new Date().toISOString()
  };
}

export async function loadLocalMistakes(user: string): Promise<MistakeRecord[]> {
  if (typeof navigator !== "undefined" && navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const records = (request.result as StoredMistake[]).filter((item) => item.owner_key === ownerKey(user)).map((item) => {
        const record = { ...item } as Partial<StoredMistake>;
        delete record.owner_key; delete record.storage_key;
        return { ...record, vocabulary: Array.isArray(record.vocabulary) ? record.vocabulary as VocabularyEntry[] : [] } as MistakeRecord;
      });
      db.close(); resolve(records);
    };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("本地错题读取失败")); };
  });
}

export async function confirmLocalMistakes(user: string, items: PendingAnalysis[]): Promise<{ inserted: number; skipped: number }> {
  const key = ownerKey(user);
  const existing = await loadLocalMistakes(key);
  const fingerprints = new Set(existing.map((item) => item.row_fingerprint).filter(Boolean));
  const records = items.map(toRecord);
  const fresh = records.filter((item, index) => items[index].force_new_attempt || !item.row_fingerprint || !fingerprints.has(item.row_fingerprint));
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    for (const item of fresh) transaction.objectStore(STORE_NAME).put({ ...item, owner_key: key, storage_key: `${key}:${item.id}` } satisfies StoredMistake);
    transaction.oncomplete = () => { db.close(); resolve({ inserted: fresh.length, skipped: records.length - fresh.length }); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("本地错题保存失败")); };
  });
}

export async function updateLocalMistake(user: string, id: string, draft: AnalysisDraft): Promise<void> {
  const items = await loadLocalMistakes(user);
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error("记录不存在");
  const db = await openDatabase();
  const updated: StoredMistake = { ...current, ...draft, id, confirmed_at: new Date().toISOString(), owner_key: ownerKey(user), storage_key: `${ownerKey(user)}:${id}` };
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite"); transaction.objectStore(STORE_NAME).put(updated);
    transaction.oncomplete = () => { db.close(); resolve(); }; transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("本地错题更新失败")); };
  });
}

export async function deleteLocalMistake(user: string, id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite"); transaction.objectStore(STORE_NAME).delete(`${ownerKey(user)}:${id}`);
    transaction.oncomplete = () => { db.close(); resolve(); }; transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("本地错题删除失败")); };
  });
}

export async function importLocalMistakes(user: string, records: MistakeRecord[]): Promise<number> {
  const key = ownerKey(user);
  const valid = records.filter((item) => item && typeof item.id === "string" && typeof item.question_text === "string" && typeof item.primary_cause === "string").slice(0, 5000);
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    for (const item of valid) transaction.objectStore(STORE_NAME).put({ ...item, owner_key: key, storage_key: `${key}:${item.id}` } satisfies StoredMistake);
    transaction.oncomplete = () => { db.close(); resolve(); }; transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("本地备份导入失败")); };
  });
  return valid.length;
}

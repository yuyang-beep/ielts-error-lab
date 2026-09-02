import type { IELTSModule, NormalizedMistake, SourceParts } from "./types";

export const REQUIRED_HEADERS = [
  "日期",
  "题号",
  "题目",
  "原文",
  "笔记",
  "笔记内容标签",
  "我的答案",
  "正确答案"
] as const;

export type RawRow = Record<string, unknown>;

export function plainText(value: unknown): string {
  const scalar = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";
  const input = scalar.replace(/<\s*br\s*\/?>/gi, "\n");
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

export function splitTags(value: unknown): string[] {
  return plainText(value)
    .split(/[、,，;；|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeAnswer(value: unknown): {
  answer: string | null;
  state: "answered" | "unanswered";
} {
  const text = plainText(value);
  if (!text || /^(未作答|未答|空白|unanswered)$/i.test(text)) {
    return { answer: null, state: "unanswered" };
  }
  return {
    answer: text
      .replace(/\s*[，、;；|/]+\s*/g, ", ")
      .replace(/\s+/g, " ")
      .trim(),
    state: "answered"
  };
}

export function normalizeCorrectAnswer(value: unknown): string {
  return plainText(value)
    .replace(/\s*[，、;；|/]+\s*/g, ", ")
    .replace(/\s+/g, " ")
    .toUpperCase()
    .trim();
}

export function parseAttemptDate(raw: unknown, importYear: number) {
  const text = plainText(raw);
  const full = text.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
  const partial = text.match(/^(\d{1,2})[-/.月](\d{1,2})日?$/);
  const year = full ? Number(full[1]) : importYear;
  const month = Number(full?.[2] ?? partial?.[1]);
  const day = Number(full?.[3] ?? partial?.[2]);
  if ((!full && !partial) || month < 1 || month > 12 || day < 1 || day > 31) {
    return { iso: null, inferred: false, warning: text ? `无法识别日期“${text}”` : "日期为空" };
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { iso: null, inferred: false, warning: `日期“${text}”不存在` };
  }
  return {
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    inferred: Boolean(partial),
    warning: partial ? `日期缺少年份，按导入年份 ${importYear} 推断` : null
  };
}

export function parseSourceLabel(value: unknown): SourceParts {
  const label = plainText(value);
  const book = label.match(/(?:剑雅|Cambridge\s*(?:IELTS)?\s*)(\d+)/i)?.[1];
  const test = label.match(/Test\s*(\d+)/i)?.[1];
  const sectionMatch = label.match(/(Passage|Part|Section)\s*(\d+)/i);
  const range = label.match(/(?:Q(?:uestion)?s?\s*)?(\d+)\s*[-–—~至]\s*(\d+)/i);
  const singleMatches = [...label.matchAll(/(?:Q(?:uestion)?\s*)(\d+)/gi)];
  const single = singleMatches.at(-1)?.[1];
  return {
    book: book ? `剑雅${book}` : undefined,
    test: test ? Number(test) : undefined,
    section_kind: sectionMatch
      ? (sectionMatch[1].toLowerCase() as "passage" | "part" | "section")
      : undefined,
    section: sectionMatch ? Number(sectionMatch[2]) : undefined,
    question_start: range ? Number(range[1]) : single ? Number(single) : undefined,
    question_end: range ? Number(range[2]) : single ? Number(single) : undefined
  };
}

export function inferQuestionType(text: string, module: IELTSModule): string | null {
  const value = text.toLowerCase();
  if (module === "reading") {
    if (/true\s*\/\s*false\s*\/\s*not given|\btrue\b[\s\S]*\bfalse\b[\s\S]*\bnot given\b/i.test(text)) return "R_TFNG";
    if (/yes\s*\/\s*no\s*\/\s*not given|\byes\b[\s\S]*\bno\b[\s\S]*\bnot given\b/i.test(text)) return "R_YNNG";
    if (value.includes("heading")) return "R_HEADING_MATCH";
    if (value.includes("choose two") || value.includes("choose three")) return "R_MULTIPLE_CHOICE";
    if (/[a-d][.)]/i.test(text)) return "R_SINGLE_CHOICE";
  } else {
    if (/map|plan|diagram/i.test(text)) return "L_MAP_PLAN_DIAGRAM";
    if (/choose two|choose three/i.test(text)) return "L_MULTIPLE_CHOICE";
    if (/[a-d][.)]/i.test(text)) return "L_SINGLE_CHOICE";
  }
  return null;
}

export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

export async function normalizeRawRow(
  raw: RawRow,
  rowNumber: number,
  module: IELTSModule,
  importYear: number
): Promise<NormalizedMistake> {
  const warnings: string[] = [];
  const attemptedRaw = plainText(raw["日期"]);
  const date = parseAttemptDate(attemptedRaw, importYear);
  if (date.warning) warnings.push(date.warning);
  const questionText = plainText(raw["题目"]);
  const evidence = plainText(raw["原文"]);
  const sourceLabel = plainText(raw["题号"]);
  const user = normalizeAnswer(raw["我的答案"]);
  const correct = normalizeCorrectAnswer(raw["正确答案"]);
  if (!questionText) warnings.push("题目为空");
  if (!correct) warnings.push("正确答案为空");

  const questionFingerprint = await sha256(
    JSON.stringify([module, sourceLabel.toLowerCase(), questionText.toLowerCase(), correct])
  );
  const rowFingerprint = await sha256(
    JSON.stringify([
      questionFingerprint,
      attemptedRaw,
      user.answer,
      plainText(raw["笔记"]),
      evidence
    ])
  );

  return {
    client_id: crypto.randomUUID(),
    row_number: rowNumber,
    attempted_on_raw: attemptedRaw,
    attempted_on: date.iso,
    date_inferred: date.inferred,
    source_label: sourceLabel,
    source_parts: parseSourceLabel(sourceLabel),
    question_text: questionText,
    evidence_context: evidence,
    source_note: plainText(raw["笔记"]),
    source_tags: splitTags(raw["笔记内容标签"]),
    user_answer: user.answer,
    answer_state: user.state,
    correct_answer: correct,
    module,
    question_type_hint: inferQuestionType(questionText, module),
    row_fingerprint: rowFingerprint,
    question_fingerprint: questionFingerprint,
    warnings
  };
}

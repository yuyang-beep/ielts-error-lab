import type { IELTSModule, NormalizedMistake, SourceParts } from "./types";
import { QUESTION_TYPE_CODES } from "./taxonomy";

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

export const SOURCE_ANALYSIS_HEADERS = ["解析", "题目解析", "答案解析", "官方解析", "错题解析"] as const;
export const QUESTION_TYPE_HEADERS = ["题型", "题目类型", "题型名称", "Question Type", "question_type", "类型"] as const;

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

export function normalizeQuestionTypeHint(value: unknown, module: IELTSModule): string | null {
  const text = plainText(value);
  if (!text) return null;
  const directCode = text.toUpperCase().replace(/[\s-]+/g, "_");
  if ((QUESTION_TYPE_CODES as readonly string[]).includes(directCode)) return directCode;
  if (module === "reading") {
    if (/true\s*\/?\s*false\s*\/?\s*not\s*given|判断|t\s*\/?\s*f\s*\/?\s*ng/i.test(text)) return "R_TFNG";
    if (/yes\s*\/?\s*no\s*\/?\s*not\s*given|是非|y\s*\/?\s*n\s*\/?\s*ng/i.test(text)) return "R_YNNG";
    if (/段落.?标题|heading/i.test(text)) return "R_HEADING_MATCH";
    if (/信息匹配|段落.?信息|matching\s+information/i.test(text)) return "R_INFORMATION_MATCH";
    if (/人物|特征|人名|feature/i.test(text)) return "R_FEATURE_MATCH";
    if (/句尾|句子结尾|sentence\s+end/i.test(text)) return "R_SENTENCE_END_MATCH";
    if (/摘要|summary/i.test(text)) return "R_SUMMARY_COMPLETION";
    if (/句子填空|sentence\s+completion/i.test(text)) return "R_SENTENCE_COMPLETION";
    if (/表格|笔记|流程图|note|table|flow\s*chart/i.test(text)) return "R_NOTE_TABLE_FLOW_COMPLETION";
    if (/图示|图表标注|diagram/i.test(text)) return "R_DIAGRAM_LABEL";
    if (/简答|short\s+answer/i.test(text)) return "R_SHORT_ANSWER";
    if (/多选|multiple|choose\s+(two|three)|选择.{0,5}(两|三|2|3)/i.test(text)) return "R_MULTIPLE_CHOICE";
    if (/单选|single|选择题/i.test(text)) return "R_SINGLE_CHOICE";
  } else {
    if (/地图|平面图|图示|map|plan|diagram/i.test(text)) return "L_MAP_PLAN_DIAGRAM";
    if (/流程图|flow\s*chart/i.test(text)) return "L_FLOW_CHART";
    if (/表格|笔记|表单|form|note|table/i.test(text)) return "L_FORM_NOTE_TABLE";
    if (/句子填空|sentence\s+completion/i.test(text)) return "L_SENTENCE_COMPLETION";
    if (/简答|short\s+answer/i.test(text)) return "L_SHORT_ANSWER";
    if (/多选|multiple|choose\s+(two|three)|选择.{0,5}(两|三|2|3)/i.test(text)) return "L_MULTIPLE_CHOICE";
    if (/单选|single|选择题/i.test(text)) return "L_SINGLE_CHOICE";
    if (/匹配|matching/i.test(text)) return "L_MATCHING";
  }
  return null;
}

export function inferQuestionType(text: string, module: IELTSModule): string | null {
  return normalizeQuestionTypeHint(text, module);
}

export function officialQuestionType(raw: RawRow, module: IELTSModule): string | null {
  for (const header of QUESTION_TYPE_HEADERS) {
    const value = normalizeQuestionTypeHint(raw[header], module);
    if (value) return value;
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
  const officialType = officialQuestionType(raw, module);
  const sourceAnalysis = SOURCE_ANALYSIS_HEADERS.map((header) => plainText(raw[header]))
    .filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join("\n");
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
      evidence,
      sourceAnalysis
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
    source_analysis: sourceAnalysis,
    source_note: plainText(raw["笔记"]),
    source_tags: splitTags(raw["笔记内容标签"]),
    user_answer: user.answer,
    answer_state: user.state,
    correct_answer: correct,
    module,
    question_type_hint: officialType ?? inferQuestionType(questionText, module),
    official_question_type: officialType,
    row_fingerprint: rowFingerprint,
    question_fingerprint: questionFingerprint,
    warnings
  };
}

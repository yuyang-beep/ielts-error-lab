import type { NormalizedMistake } from "./types";
import { CAUSES } from "./taxonomy";

export type CauseCandidate = {
  code: keyof typeof CAUSES;
  label: string;
  checkpoint: string;
};

const CHECKPOINTS: Record<keyof typeof CAUSES, string> = {
  K_VOCAB: "关键词或固定搭配不认识，导致句意无法建立。",
  K_GRAMMAR: "单词都认识，但长难句的主干、修饰或从句关系判断错误。",
  K_BACKGROUND: "理解题目必须依赖文中未解释、但考试默认要求的背景概念。",
  C_PARAPHRASE: "没有把题干表达与原文中的同义改写建立对应。",
  C_DETAIL: "已定位到相关位置，但漏读限定词、对象、数字或其他关键细节。",
  C_GIST: "抓住了局部信息，却没有判断段落或说话人的核心意思。",
  C_INFERENCE: "证据只能支持有限结论，却推导出了更强或不同的结论。",
  C_STANCE: "没有识别作者或说话人的态度、评价方向与保留程度。",
  C_COHESION: "代词、同义指称或上下句衔接对象对应错误。",
  C_LOGIC: "忽略否定、数量、比较、程度、条件或因果关系。",
  S_INSTRUCTION: "没有遵守题目要求、答案形式或选择数量。",
  S_LOCATE: "定位词选择不当，或没有找到真正承载答案的证据句。",
  S_SCOPE: "把局部信息扩大到整体，或混淆不同人物、时间与讨论范围。",
  S_TFNG_BOUNDARY: "把“原文未说”当成错误，或把相关信息误当成明确支持。",
  S_OPTION_COMPARE: "只判断单个选项是否合理，没有把所有选项放回同一证据范围比较。",
  S_DISTRACTOR: "被原词复现、先说后改或部分正确的干扰信息吸引。",
  S_PREDICTION: "听前没有预测词性、语义范围或答案形式。",
  P_PHONEME: "目标词的关键音素辨识错误。",
  P_CONNECTED_SPEECH: "连读、弱读、失爆或音变使熟悉词没有被识别。",
  P_SEGMENTATION: "没有正确切分连续语流中的词边界。",
  P_ACCENT_SPEED: "在特定口音或语速下无法稳定解码已知表达。",
  P_NUMBER_NAME: "数字、日期、专有名词或逐字拼写记录错误。",
  P_SIGNAL: "漏掉转折、否定、修正或答案更新信号。",
  E_SPELLING: "已经听懂或定位正确，但答案拼写错误。",
  E_MORPHOLOGY: "答案词义正确，但单复数、时态或词形不符合句法。",
  E_WORD_LIMIT: "答案内容正确，但超过题目规定字数。",
  E_TRANSFER: "草稿判断正确，转写到答案时发生遗漏或错位。",
  E_FORMAT: "大小写、组合方式或答案格式不符合要求。",
  B_TIME: "仅当你的笔记明确说明时间不足时使用。",
  B_ATTENTION: "仅当你的笔记明确说明走神或漏看时使用。",
  B_MEMORY: "仅当你的笔记明确说明信息保持困难时使用。",
  B_OVERTHINK: "仅当你的笔记明确说明过度推理时使用。",
  B_CHANGED_ANSWER: "仅当你的笔记明确说明把正确答案改错时使用。",
  B_GUESS: "仅当你的笔记明确说明属于猜测时使用。",
  U_UNCONFIRMED: "现有材料不能还原真实作答过程，需要你回答诊断问题。"
};

const BY_QUESTION_TYPE: Record<string, Array<keyof typeof CAUSES>> = {
  R_TFNG: ["S_TFNG_BOUNDARY", "S_SCOPE", "C_LOGIC", "C_PARAPHRASE", "S_LOCATE"],
  R_YNNG: ["S_TFNG_BOUNDARY", "C_STANCE", "S_SCOPE", "C_PARAPHRASE", "S_LOCATE"],
  R_SINGLE_CHOICE: ["S_DISTRACTOR", "S_OPTION_COMPARE", "C_PARAPHRASE", "C_DETAIL", "S_SCOPE"],
  R_MULTIPLE_CHOICE: ["S_OPTION_COMPARE", "S_DISTRACTOR", "C_DETAIL", "C_PARAPHRASE", "S_INSTRUCTION"],
  R_HEADING_MATCH: ["C_GIST", "S_SCOPE", "S_LOCATE", "C_COHESION", "S_DISTRACTOR"],
  R_INFORMATION_MATCH: ["S_LOCATE", "C_PARAPHRASE", "S_SCOPE", "C_DETAIL", "C_COHESION"],
  R_FEATURE_MATCH: ["S_LOCATE", "C_COHESION", "C_PARAPHRASE", "S_SCOPE", "C_DETAIL"],
  R_SENTENCE_END_MATCH: ["K_GRAMMAR", "C_COHESION", "C_PARAPHRASE", "S_OPTION_COMPARE", "C_LOGIC"],
  R_SENTENCE_COMPLETION: ["C_PARAPHRASE", "S_INSTRUCTION", "E_WORD_LIMIT", "K_GRAMMAR", "E_MORPHOLOGY"],
  R_SUMMARY_COMPLETION: ["C_PARAPHRASE", "C_GIST", "S_LOCATE", "K_GRAMMAR", "E_MORPHOLOGY"],
  R_NOTE_TABLE_FLOW_COMPLETION: ["S_LOCATE", "C_PARAPHRASE", "S_INSTRUCTION", "E_WORD_LIMIT", "E_MORPHOLOGY"],
  R_DIAGRAM_LABEL: ["S_LOCATE", "C_PARAPHRASE", "C_COHESION", "E_WORD_LIMIT", "E_SPELLING"],
  R_SHORT_ANSWER: ["S_LOCATE", "C_DETAIL", "S_INSTRUCTION", "E_WORD_LIMIT", "C_PARAPHRASE"],
  L_FORM_NOTE_TABLE: ["P_SEGMENTATION", "P_CONNECTED_SPEECH", "E_SPELLING", "E_MORPHOLOGY", "P_NUMBER_NAME"],
  L_SENTENCE_COMPLETION: ["S_PREDICTION", "P_SEGMENTATION", "P_CONNECTED_SPEECH", "E_MORPHOLOGY", "E_SPELLING"],
  L_SHORT_ANSWER: ["C_DETAIL", "P_SEGMENTATION", "P_CONNECTED_SPEECH", "E_SPELLING", "E_WORD_LIMIT"],
  L_SINGLE_CHOICE: ["S_DISTRACTOR", "P_SIGNAL", "S_OPTION_COMPARE", "C_DETAIL", "S_PREDICTION"],
  L_MULTIPLE_CHOICE: ["S_OPTION_COMPARE", "S_DISTRACTOR", "P_SIGNAL", "C_DETAIL", "S_INSTRUCTION"],
  L_MATCHING: ["S_DISTRACTOR", "P_SIGNAL", "C_PARAPHRASE", "S_OPTION_COMPARE", "C_DETAIL"],
  L_MAP_PLAN_DIAGRAM: ["P_SIGNAL", "S_LOCATE", "P_CONNECTED_SPEECH", "C_COHESION", "S_PREDICTION"],
  L_FLOW_CHART: ["P_SIGNAL", "S_PREDICTION", "P_SEGMENTATION", "C_DETAIL", "C_COHESION"]
};

const TAG_CAUSES: Array<[RegExp, keyof typeof CAUSES]> = [
  [/定位/, "S_LOCATE"], [/同义|替换|改写/, "C_PARAPHRASE"], [/词汇|单词/, "K_VOCAB"],
  [/长难句|语法|句法/, "K_GRAMMAR"], [/细节/, "C_DETAIL"], [/主旨/, "C_GIST"],
  [/干扰/, "S_DISTRACTOR"], [/拼写/, "E_SPELLING"], [/单复数|词形/, "E_MORPHOLOGY"],
  [/连读|弱读/, "P_CONNECTED_SPEECH"], [/转折|修正/, "P_SIGNAL"]
];

export function isMeaningfulEvidence(value: string): boolean {
  const text = value.trim();
  if (text.length < 2) return false;
  return !/^(?:q(?:uestion)?\s*)?[\d\s,，、;；./#_\-–—]+$/i.test(text);
}

export function hasMeaningfulUserEvidence(row: Pick<NormalizedMistake, "source_note" | "source_tags">): boolean {
  return isMeaningfulEvidence(row.source_note) || row.source_tags.some(isMeaningfulEvidence);
}

export function getCauseCandidates(
  row: Pick<NormalizedMistake, "module" | "question_type_hint" | "source_tags">,
  questionType?: string
): CauseCandidate[] {
  const type = questionType || row.question_type_hint || (row.module === "reading" ? "R_OTHER" : "L_OTHER");
  const tagCodes = row.source_tags.filter(isMeaningfulEvidence).flatMap((tag) =>
    TAG_CAUSES.filter(([pattern]) => pattern.test(tag)).map(([, code]) => code)
  );
  const defaults = BY_QUESTION_TYPE[type] ?? (row.module === "reading"
    ? ["C_PARAPHRASE", "S_LOCATE", "C_DETAIL", "C_LOGIC", "S_SCOPE"]
    : ["P_CONNECTED_SPEECH", "P_SEGMENTATION", "S_DISTRACTOR", "P_SIGNAL", "E_SPELLING"]);
  return [...new Set([...tagCodes, ...defaults])].slice(0, 5).map((code) => ({
    code,
    label: CAUSES[code],
    checkpoint: CHECKPOINTS[code]
  }));
}

export function causeCheckpoint(code: keyof typeof CAUSES): string {
  return CHECKPOINTS[code];
}

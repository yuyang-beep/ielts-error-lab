export const TAXONOMY_VERSION = "1.1.0";
export const PROMPT_VERSION = "2.1.0";

export const QUESTION_TYPES = {
  reading: {
    R_TFNG: "T / F / NG",
    R_YNNG: "Y / N / NG",
    R_SINGLE_CHOICE: "单选",
    R_MULTIPLE_CHOICE: "多选",
    R_HEADING_MATCH: "段落标题匹配",
    R_INFORMATION_MATCH: "信息匹配",
    R_FEATURE_MATCH: "人物 / 特征匹配",
    R_SENTENCE_END_MATCH: "句尾匹配",
    R_SENTENCE_COMPLETION: "句子填空",
    R_SUMMARY_COMPLETION: "摘要填空",
    R_NOTE_TABLE_FLOW_COMPLETION: "笔记 / 表格 / 流程图填空",
    R_DIAGRAM_LABEL: "图示标注",
    R_SHORT_ANSWER: "简答",
    R_OTHER: "其他阅读题型"
  },
  listening: {
    L_FORM_NOTE_TABLE: "表格 / 笔记 / 表单填空",
    L_SENTENCE_COMPLETION: "句子填空",
    L_SHORT_ANSWER: "简答",
    L_SINGLE_CHOICE: "单选",
    L_MULTIPLE_CHOICE: "多选",
    L_MATCHING: "匹配",
    L_MAP_PLAN_DIAGRAM: "地图 / 平面图 / 图示",
    L_FLOW_CHART: "流程图",
    L_OTHER: "其他听力题型"
  }
} as const;

export const CAUSES = {
  K_VOCAB: "词义知识缺口",
  K_GRAMMAR: "句法知识缺口",
  K_BACKGROUND: "必要背景知识缺口",
  C_PARAPHRASE: "同义改写识别",
  C_DETAIL: "细节理解",
  C_GIST: "主旨理解",
  C_INFERENCE: "推断",
  C_STANCE: "作者立场",
  C_COHESION: "指代与衔接",
  C_LOGIC: "否定、数量、比较或因果逻辑",
  S_INSTRUCTION: "题目要求理解",
  S_LOCATE: "定位策略",
  S_SCOPE: "信息范围",
  S_TFNG_BOUNDARY: "False / Not Given 边界",
  S_OPTION_COMPARE: "选项比较",
  S_DISTRACTOR: "干扰项识别",
  S_PREDICTION: "听前预测",
  P_PHONEME: "音素辨识",
  P_CONNECTED_SPEECH: "连读与弱读",
  P_SEGMENTATION: "词边界切分",
  P_ACCENT_SPEED: "口音与语速",
  P_NUMBER_NAME: "数字、姓名与拼写",
  P_SIGNAL: "转折与修正信号",
  E_SPELLING: "拼写",
  E_MORPHOLOGY: "单复数或词形",
  E_WORD_LIMIT: "字数限制",
  E_TRANSFER: "誊写",
  E_FORMAT: "答案格式",
  B_TIME: "时间管理",
  B_ATTENTION: "注意力",
  B_MEMORY: "工作记忆",
  B_OVERTHINK: "过度推理",
  B_CHANGED_ANSWER: "改错答案",
  B_GUESS: "猜测",
  U_UNCONFIRMED: "现有证据不足，待确认"
} as const;

export const QUESTION_TYPE_CODES = Object.values(QUESTION_TYPES).flatMap((group) =>
  Object.keys(group)
);
export const CAUSE_CODES = Object.keys(CAUSES);
export const BEHAVIOR_CAUSES = CAUSE_CODES.filter((code) => code.startsWith("B_"));

export function questionTypeLabel(code: string) {
  for (const group of Object.values(QUESTION_TYPES)) {
    if (code in group) return group[code as keyof typeof group];
  }
  return code;
}

export function causeLabel(code: string) {
  return CAUSES[code as keyof typeof CAUSES] ?? code;
}

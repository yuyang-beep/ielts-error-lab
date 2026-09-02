export interface MultipleAnswerComparison {
  user: string[];
  correct: string[];
  matched: string[];
  wrong: string[];
  missed: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toUpperCase()).filter(Boolean))];
}

/** Parse option labels such as "C,D", "C、D", "C / D" or "CD". */
export function parseAnswerTokens(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  const text = value.trim().replace(/[（(]/g, " ").replace(/[）)]/g, " ");
  const labels = [...text.matchAll(/\b([A-H])\b/gi)].map((match) => match[1]);
  if (labels.length) return unique(labels);
  if (/^[A-H]{2,4}$/i.test(text.replace(/\s+/g, ""))) return unique(text.replace(/\s+/g, "").split(""));
  return unique(text.split(/[、,，;；|/]+/).map((part) => part.trim()).filter(Boolean));
}

export function compareMultipleAnswers(userAnswer: string | null | undefined, correctAnswer: string): MultipleAnswerComparison {
  const user = parseAnswerTokens(userAnswer);
  const correct = parseAnswerTokens(correctAnswer);
  const correctSet = new Set(correct);
  const userSet = new Set(user);
  return {
    user,
    correct,
    matched: user.filter((token) => correctSet.has(token)),
    wrong: user.filter((token) => !correctSet.has(token)),
    missed: correct.filter((token) => !userSet.has(token))
  };
}

export function isMultipleChoiceType(questionType: string): boolean {
  return questionType === "R_MULTIPLE_CHOICE" || questionType === "L_MULTIPLE_CHOICE";
}

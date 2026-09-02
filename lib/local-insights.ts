import type { InsightData, MistakeRecord } from "./types";

function counts(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export function buildLocalInsights(items: MistakeRecord[]): InsightData {
  const trendMap = new Map<string, number>(); const matrixMap = new Map<string, number>();
  for (const item of items) {
    const month = (item.attempted_on ?? item.confirmed_at).slice(0, 7); trendMap.set(month, (trendMap.get(month) ?? 0) + 1);
    const key = `${item.question_type}|||${item.primary_cause}`; matrixMap.set(key, (matrixMap.get(key) ?? 0) + 1);
  }
  return {
    total_attempts: items.length,
    by_module: counts(items.map((item) => item.module)),
    by_question_type: counts(items.map((item) => item.question_type)),
    by_cause: counts(items.map((item) => item.primary_cause)),
    trend: [...trendMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count })),
    matrix: [...matrixMap.entries()].map(([key, count]) => { const [question_type, cause] = key.split("|||"); return { question_type, cause, count }; })
  };
}

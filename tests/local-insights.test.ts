import { describe, expect, it } from "vitest";
import { buildLocalInsights } from "@/lib/local-insights";
import type { MistakeRecord } from "@/lib/types";

function record(id: string, primary_cause: string, secondary_causes: string[] = []): MistakeRecord {
  return {
    id, attempt_id: id, client_id: id, row_fingerprint: id, module: "reading", source_label: "剑雅21 Test 1", question_text: "题目", evidence_context: "证据", source_analysis: "", user_answer: "A", correct_answer: "B", attempted_on: "2026-09-01", source_note: "", source_tags: [], source_url: null, question_type: "R_TFNG", primary_cause, secondary_causes, answer_comparison: "题干命题：题目\n我的答案：A\n正确答案：B\n答案差异：不同", evidence_span: "证据", trap_mechanism: "陷阱", diagnostic_question: "问题", confidence: 0.8, provenance: ["user_confirmation"], confirmed_at: "2026-09-01T00:00:00.000Z"
  };
}

describe("browser-local insights", () => {
  it("按已确认错题生成错因、题型和月份统计", () => {
    const data = buildLocalInsights([record("1", "C_DETAIL", ["E_SPELLING"]), record("2", "C_DETAIL")]);
    expect(data.total_attempts).toBe(2);
    expect(data.by_cause).toEqual([{ label: "C_DETAIL", count: 2 }]);
    expect(data.by_question_type).toEqual([{ label: "R_TFNG", count: 2 }]);
    expect(data.trend).toEqual([{ label: "2026-09", count: 2 }]);
  });
});

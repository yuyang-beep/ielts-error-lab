import { describe, expect, it, vi } from "vitest";
import { analyzeRows, DeepSeekConfigurationError, deepSeekInternals } from "@/lib/deepseek";
import type { NormalizedMistake } from "@/lib/types";

const row: NormalizedMistake = {
  client_id: "client-1", row_number: 2, attempted_on_raw: "08-02", attempted_on: "2026-08-02",
  date_inferred: true, source_label: "剑雅20 Test 4 Passage 1 Q12", source_parts: {},
  question_text: "TRUE / FALSE / NOT GIVEN", evidence_context: "The patio was inspirational.",
  source_analysis: "",
  source_note: "", source_tags: [], user_answer: null, answer_state: "unanswered", correct_answer: "NG",
  module: "reading", question_type_hint: "R_TFNG", row_fingerprint: "a".repeat(64),
  question_fingerprint: "b".repeat(64), warnings: []
};

const valid = {
  client_id: "client-1", question_type: "R_TFNG", primary_cause: "U_UNCONFIRMED",
  secondary_causes: [], evidence_span: "", reasoning_chain: "原文未说明最喜欢。",
  trap_mechanism: "把积极评价扩大为偏好判断", diagnostic_question: "你当时卡在哪一步？",
  remediation_rule: "只比较题干命题与原文明确范围。",
  confidence: 0.72, provenance: ["text_evidence", "ai_inference"]
};

describe("DeepSeek 结构化分析", () => {
  it("提取 Responses API output_text", () => {
    expect(deepSeekInternals.extractOutputText({ output: [{ content: [{ type: "output_text", text: "{}" }] }] })).toBe("{}");
  });

  it("无密钥时不发请求", async () => {
    await expect(analyzeRows([row], {})).rejects.toBeInstanceOf(DeepSeekConfigurationError);
  });

  it("接受合法 JSON Schema 输出", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: JSON.stringify(valid) }), { status: 200 }));
    const result = await analyzeRows([row], { apiKey: "test-secret" }, fetcher);
    expect(result[0].primary_cause).toBe("U_UNCONFIRMED");
    expect(fetcher).toHaveBeenCalledOnce();
    const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(request).toMatchObject({ reasoning: { effort: "low" }, max_output_tokens: 2000 });
    expect(request.instructions).toContain("trap_mechanism 必须交付");
    expect(request.input).not.toContain("micro_drill");
  });

  it("非法输出重试一次后安全转手工分析", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: "{broken" }), { status: 200 }));
    const result = await analyzeRows([row], { apiKey: "test-secret" }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result[0]).toMatchObject({ primary_cause: "U_UNCONFIRMED", status: "manual_required", confidence: 0 });
    expect(result[0].trap_mechanism.length).toBeGreaterThan(0);
  });

  it("拒绝对无笔记未作答题臆测行为原因", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: JSON.stringify({ ...valid, primary_cause: "B_ATTENTION" }) }), { status: 200 }));
    const result = await analyzeRows([row], { apiKey: "test-secret" }, fetcher);
    expect(result[0].primary_cause).toBe("U_UNCONFIRMED");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("已作答但无用户笔记时也拒绝行为类根因", async () => {
    const answered = { ...row, user_answer: "FALSE", answer_state: "answered" as const };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: JSON.stringify({ ...valid, primary_cause: "B_TIME" }) }), { status: 200 }));
    const result = await analyzeRows([answered], { apiKey: "test-secret" }, fetcher);
    expect(result[0]).toMatchObject({ primary_cause: "U_UNCONFIRMED", status: "manual_required" });
  });

  it("纯数字爱听写笔记和标签不算主观证据", async () => {
    const numbered = { ...row, source_note: "12", source_tags: ["12"] };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: JSON.stringify({ ...valid, primary_cause: "B_ATTENTION", provenance: ["user_note"] }) }), { status: 200 }));
    const result = await analyzeRows([numbered], { apiKey: "test-secret" }, fetcher);
    expect(result[0]).toMatchObject({ primary_cause: "U_UNCONFIRMED", status: "manual_required" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

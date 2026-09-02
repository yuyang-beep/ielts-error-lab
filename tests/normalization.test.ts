import { describe, expect, it } from "vitest";
import { inferQuestionType, normalizeAnswer, normalizeCorrectAnswer, parseAttemptDate, parseSourceLabel, plainText, splitTags } from "@/lib/normalization";

describe("数据归一化", () => {
  it("将未作答转换为 null 且保留状态", () => {
    expect(normalizeAnswer("未作答")).toEqual({ answer: null, state: "unanswered" });
  });

  it("统一多答案分隔符和正确答案大小写", () => {
    expect(normalizeCorrectAnswer(" ng； true / false ")).toBe("NG, TRUE, FALSE");
  });

  it("解析缺少年份日期并明确标注推断", () => {
    expect(parseAttemptDate("08-02", 2026)).toMatchObject({ iso: "2026-08-02", inferred: true });
    expect(parseAttemptDate("2025-02-29", 2026).iso).toBeNull();
  });

  it("解析剑雅来源与题号", () => {
    expect(parseSourceLabel("剑雅20 Test 4 Passage 1 Q12")).toEqual({
      book: "剑雅20", test: 4, section_kind: "passage", section: 1, question_start: 12, question_end: 12
    });
    expect(parseSourceLabel("Cambridge IELTS 18 Test 2 Section 3 Q21-23")).toMatchObject({
      book: "剑雅18", section_kind: "section", question_start: 21, question_end: 23
    });
  });

  it("识别 T/F/NG 并安全转纯文本", () => {
    expect(inferQuestionType("Choose TRUE / FALSE / NOT GIVEN", "reading")).toBe("R_TFNG");
    expect(plainText("<b>题目</b><script>alert(1)</script>")).toBe("题目 alert(1)");
    expect(splitTags("定位、同义替换，逻辑")).toEqual(["定位", "同义替换", "逻辑"]);
  });
});

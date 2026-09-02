import { describe, expect, it } from "vitest";
import { compareMultipleAnswers, isMultipleChoiceType, parseAnswerTokens } from "@/lib/answer-comparison";

describe("双选题答案核对", () => {
  it("支持逗号、顿号和连写选项", () => {
    expect(parseAnswerTokens("C、D")).toEqual(["C", "D"]);
    expect(parseAnswerTokens("CD")).toEqual(["C", "D"]);
    expect(parseAnswerTokens("A / B")).toEqual(["A", "B"]);
  });

  it("标出重叠、错选和漏选", () => {
    expect(compareMultipleAnswers("C,E", "C,D")).toMatchObject({
      user: ["C", "E"],
      correct: ["C", "D"],
      matched: ["C"],
      wrong: ["E"],
      missed: ["D"]
    });
  });

  it("区分阅读和听力双选题", () => {
    expect(isMultipleChoiceType("R_MULTIPLE_CHOICE")).toBe(true);
    expect(isMultipleChoiceType("L_MULTIPLE_CHOICE")).toBe(true);
    expect(isMultipleChoiceType("R_SINGLE_CHOICE")).toBe(false);
  });
});

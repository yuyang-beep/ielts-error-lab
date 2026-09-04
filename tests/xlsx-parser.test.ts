import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { parseWorkbook } from "@/lib/xlsx-parser";

const headers = ["日期", "题号", "题目", "原文", "笔记", "笔记内容标签", "我的答案", "正确答案"];

function xmlEscape(value: unknown) {
  const scalar = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
  return scalar.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function columnName(index: number) {
  let name = "";
  for (let value = index + 1; value; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function workbookFile(rows: unknown[][], name = "阅读错题本.xlsx", withFormula = false) {
  const sheetRows = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, colIndex) => {
    const ref = `${columnName(colIndex)}${rowIndex + 1}`;
    return withFormula && rowIndex === 1 && colIndex === 4
      ? `<c r="${ref}"><f>1+1</f><v>2</v></c>`
      : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cell)}</t></is></c>`;
  }).join("")}</row>`).join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="错题列表" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`),
    "xl/worksheets/sheet1.xml": strToU8(`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`)
  };
  const bytes = zipSync(files);
  return new File([bytes], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("爱听写 XLSX 输入契约", () => {
  it("按表头映射样例阅读错题", async () => {
    const file = workbookFile([headers, ["08-02", "剑雅20 Test 4 Passage 1 Q12", "The pictures were favourites. TRUE / FALSE / NOT GIVEN", "The patio was inspirational and painted more than 30 times.", "", "", "未作答", "NG"]]);
    const report = await parseWorkbook(file, undefined, 2026);
    expect(report.blocking_errors).toEqual([]);
    expect(report.inferred_module).toBe("reading");
    expect(report.valid_rows).toBe(1);
    expect(report.rows[0]).toMatchObject({ answer_state: "unanswered", user_answer: null, correct_answer: "NG", date_inferred: true, attempted_on: "2026-08-02", question_type_hint: "R_TFNG" });
  });

  it("不依赖列顺序、允许额外列并警告公式", async () => {
    const reordered = ["正确答案", "题目", "日期", "答案解析", "额外信息", "我的答案", "题号", "原文", "笔记内容标签", "笔记"];
    const file = workbookFile([reordered, ["B", "Choose A. one B. two", "2026-08-01", "B 对应原文的同义改写", "ignore", "A", "剑雅19 Test 1 Passage 2 Q15", "evidence", "选项，定位", ""]], "阅读.xlsx", true);
    const report = await parseWorkbook(file);
    expect(report.blocking_errors).toEqual([]);
    expect(report.extra_columns).toEqual(["额外信息"]);
    expect(report.rows[0].source_analysis).toBe("B 对应原文的同义改写");
    expect(report.warnings.join(" ")).toContain("公式");
  });

  it("读取爱听写官方题型列并保留官方标记", async () => {
    const officialHeaders = [...headers, "题型"];
    const file = workbookFile([officialHeaders, ["08-02", "剑雅20 Test 1 Passage 1 Q1", "Choose a heading", "evidence", "", "", "A", "A", "段落标题匹配"]], "阅读.xlsx");
    const report = await parseWorkbook(file);
    expect(report.extra_columns).not.toContain("题型");
    expect(report.rows[0]).toMatchObject({ question_type_hint: "R_HEADING_MATCH", official_question_type: "R_HEADING_MATCH" });
  });

  it("缺少必需列时阻止分析", async () => {
    const report = await parseWorkbook(workbookFile([headers.slice(0, -1), ["08-02"]]));
    expect(report.blocking_errors.join(" ")).toContain("正确答案");
    expect(report.rows).toEqual([]);
  });

  it("文件名不明确时要求选择模块", async () => {
    const file = workbookFile([headers, ["08-02", "Unit 3 Q1", "Complete the form", "hello", "", "", "helo", "HELLO"]], "错题.xlsx");
    expect((await parseWorkbook(file, undefined, 2026)).blocking_errors.join(" ")).toContain("选择模块");
    expect((await parseWorkbook(file, "listening", 2026)).rows[0].module).toBe("listening");
  });
});

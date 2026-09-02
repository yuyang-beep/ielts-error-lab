import type { IELTSModule, ImportReport } from "./types";
import { normalizeRawRow, plainText, REQUIRED_HEADERS, sha256 } from "./normalization";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_DATA_ROWS = 2000;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

function inspectZip(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  let offset = 0;
  let entries = 0;
  let uncompressedBytes = 0;
  while (offset + 46 <= view.byteLength) {
    if (view.getUint32(offset, true) === 0x02014b50) {
      entries += 1;
      uncompressedBytes += view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      offset += 46 + nameLength + extraLength + commentLength;
      continue;
    }
    offset += 1;
  }
  if (!entries) throw new Error("文件不是有效的 XLSX ZIP 容器");
  if (entries > 10_000 || uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
    throw new Error("XLSX 解压后体积异常，已拒绝读取");
  }
}

function inferModule(fileName: string, rows: Record<string, unknown>[]): IELTSModule | null {
  if (/听力|listen/i.test(fileName)) return "listening";
  if (/阅读|read/i.test(fileName)) return "reading";
  const sample = rows.slice(0, 8).map((row) => `${plainText(row["题号"])} ${plainText(row["题目"])}`).join(" ");
  if (/Passage|TRUE|FALSE|NOT GIVEN|YES|NO|heading/i.test(sample)) return "reading";
  if (/Section|Part\s*[1-4]|audio|speaker|听力/i.test(sample)) return "listening";
  return null;
}

export async function parseWorkbook(
  file: File,
  chosenModule?: IELTSModule,
  importYear = new Date().getFullYear()
): Promise<ImportReport> {
  const blockingErrors: string[] = [];
  const warnings: string[] = [];
  if (file.size > MAX_FILE_BYTES) blockingErrors.push("文件超过 10 MB 上限");
  if (!/\.xlsx$/i.test(file.name)) blockingErrors.push("仅支持 .xlsx 文件");
  const buffer = await file.arrayBuffer();
  const fileHash = await sha256(buffer);
  if (blockingErrors.length) {
    return {
      file_name: file.name, file_hash: fileHash, inferred_module: null, sheet_name: "",
      total_rows: 0, valid_rows: 0, empty_rows: 0, inferred_dates: 0, duplicate_rows: 0,
      warnings, blocking_errors: blockingErrors, extra_columns: [], rows: []
    };
  }

  inspectZip(buffer);
  const { default: readWorkbook } = await import("read-excel-file/universal");
  let sheets: Awaited<ReturnType<typeof readWorkbook>>;
  try {
    sheets = await readWorkbook(buffer);
  } catch {
    throw new Error("无法读取此 XLSX：文件可能已损坏或不是有效的 Office 工作簿");
  }
  const selectedSheet = sheets.find((sheet) => sheet.sheet === "错题列表") ?? sheets[0];
  if (!selectedSheet) throw new Error("工作簿中没有可读取的工作表");
  const sheetName = selectedSheet.sheet;
  const matrix = selectedSheet.data as unknown[][];
  const headers = (matrix[0] ?? []).map(plainText);
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) blockingErrors.push(`缺少必需列：${missing.join("、")}`);
  const extraColumns = headers.filter((header) => header && !REQUIRED_HEADERS.includes(header as never));
  if (extraColumns.length) warnings.push(`发现额外列，将忽略：${extraColumns.join("、")}`);
  if (matrix.length - 1 > MAX_DATA_ROWS) blockingErrors.push("数据超过 2,000 条上限");

  const { strFromU8, unzipSync } = await import("fflate");
  const archive = unzipSync(new Uint8Array(buffer), {
    filter: (entry) => /^xl\/worksheets\/.*\.xml$/i.test(entry.name)
  });
  const formulaCells = Object.values(archive).reduce((count, xml) =>
    count + (strFromU8(xml).match(/<f(?:\s|>)/g)?.length ?? 0), 0);
  if (formulaCells) warnings.push(`发现 ${formulaCells} 个公式单元格；公式不会执行，只读取缓存结果`);

  const rawRows: Record<string, unknown>[] = [];
  let emptyRows = 0;
  for (const values of matrix.slice(1, MAX_DATA_ROWS + 1)) {
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => { if (header) row[header] = values[index] ?? ""; });
    if (REQUIRED_HEADERS.every((header) => !plainText(row[header]))) emptyRows += 1;
    else rawRows.push(row);
  }
  const inferredModule = inferModule(file.name, rawRows);
  const resolvedModule = chosenModule ?? inferredModule;
  if (!resolvedModule) blockingErrors.push("无法自动判断阅读或听力，请先选择模块");
  const rows = resolvedModule && !missing.length
    ? await Promise.all(rawRows.map((row, index) => normalizeRawRow(row, index + 2, resolvedModule, importYear)))
    : [];
  const seen = new Set<string>();
  let duplicateRows = 0;
  for (const row of rows) {
    if (seen.has(row.row_fingerprint)) duplicateRows += 1;
    else seen.add(row.row_fingerprint);
  }
  const invalidRows = rows.filter((row) => !row.question_text || !row.correct_answer).length;
  if (invalidRows) warnings.push(`${invalidRows} 行缺少题目或正确答案，默认不选中`);
  return {
    file_name: file.name,
    file_hash: fileHash,
    inferred_module: inferredModule,
    sheet_name: sheetName,
    total_rows: matrix.length > 0 ? matrix.length - 1 : 0,
    valid_rows: rows.length - invalidRows,
    empty_rows: emptyRows,
    inferred_dates: rows.filter((row) => row.date_inferred).length,
    duplicate_rows: duplicateRows,
    warnings,
    blocking_errors: blockingErrors,
    extra_columns: extraColumns,
    rows
  };
}

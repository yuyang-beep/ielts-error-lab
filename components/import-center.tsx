import { BarChart3, ChevronRight, CircleAlert, FileSpreadsheet, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import type { IELTSModule, ImportReport } from "@/lib/types";
import { questionTypeLabel } from "@/lib/taxonomy";
import { Badge, Empty, Intro } from "./ui";

interface Props {
  file: File | null;
  moduleChoice: IELTSModule | "";
  sourceUrl: string;
  report: ImportReport | null;
  selected: Set<string>;
  busy: string | null;
  setSourceUrl: (value: string) => void;
  setModuleChoice: (value: IELTSModule | "") => void;
  setSelected: (value: Set<string> | ((current: Set<string>) => Set<string>)) => void;
  readFile: (file: File, module?: IELTSModule) => Promise<void>;
  analyze: () => Promise<void>;
}

export function ImportCenter(props: Props) {
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { file, moduleChoice, sourceUrl, report, selected, busy } = props;
  return <section>
    <Intro kicker="FROM ANSWERS TO EVIDENCE" title="把一次错题，变成下一次可复用的判断规则。" body="上传爱听写导出的 XLSX。系统先校验和预览，再由 AI 生成草稿；只有你确认后的原因才会进入错题本。" />
    <div className="import-grid">
      <div className="card pad">
        <div className="card-head"><div><span>STEP 01</span><h3>选择导出文件</h3></div><Badge tone="green">XLSX · ≤ 10 MB</Badge></div>
        <input hidden ref={fileInput} className="file-input" id="xlsx-upload" aria-label="选择 XLSX 文件" type="file" accept=".xlsx" onChange={(event) => { const next = event.target.files?.[0]; if (next) void props.readFile(next); }} />
        <button
          type="button"
          className={dragging ? "dropzone dragging" : "dropzone"}
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); const next = event.dataTransfer.files[0]; if (next) void props.readFile(next); }}
        >
          {busy === "parse" ? <LoaderCircle className="spin" /> : <FileSpreadsheet />}
          <strong>{file ? file.name : "拖入 XLSX，或点击选择文件"}</strong>
          <small>按表头名称读取，不依赖列顺序 · 最多 2,000 条</small>
        </button>
        <div className="fields two">
          <label><span>来源链接 <em>可选</em></span><input value={sourceUrl} onChange={(e) => props.setSourceUrl(e.target.value)} placeholder="https://www.idictation.cn/..." /></label>
          <label><span>练习模块</span><select value={moduleChoice} onChange={(e) => {
            const value = e.target.value as IELTSModule | ""; props.setModuleChoice(value);
            if (file && value) void props.readFile(file, value);
          }}><option value="">自动判断</option><option value="reading">阅读</option><option value="listening">听力</option></select></label>
        </div>
      </div>
      <div className="card pad">
        <div className="card-head"><div><span>STEP 02</span><h3>导入体检</h3></div>{report && <Badge tone={report.blocking_errors.length ? "red" : "green"}>{report.blocking_errors.length ? "需处理" : "可分析"}</Badge>}</div>
        {!report ? <Empty icon={BarChart3} title="等待文件" body="解析后显示有效行、推断日期、重复项与风险提示。" /> : <>
          <div className="metrics"><div><strong>{report.valid_rows}</strong><span>有效记录</span></div><div><strong>{report.empty_rows}</strong><span>空行</span></div><div><strong>{report.inferred_dates}</strong><span>日期推断</span></div><div><strong>{report.duplicate_rows}</strong><span>文件内重复</span></div></div>
          <div className="report-meta"><span>工作表</span><strong>{report.sheet_name}</strong><span>模块</span><strong>{report.inferred_module === "reading" ? "阅读" : report.inferred_module === "listening" ? "听力" : "需选择"}</strong></div>
          {[...report.blocking_errors, ...report.warnings].map((text, index) => <div className="warning" key={index}><CircleAlert />{text}</div>)}
        </>}
      </div>
    </div>

    {report?.rows.length ? <div className="card pad preview">
      <div className="card-head"><div><span>STEP 03</span><h3>选择需要分析的记录</h3></div><div className="select-actions"><span>已选 {selected.size} / {report.rows.length}</span><button onClick={() => props.setSelected(new Set(report.rows.map((row) => row.client_id)))}>全选</button><button onClick={() => props.setSelected(new Set())}>清空</button></div></div>
      <div className="table-wrap"><table><thead><tr><th aria-label="选择记录"></th><th>来源</th><th>题目</th><th>我的答案</th><th>正确答案</th><th>题型提示</th></tr></thead>
        <tbody>{report.rows.map((row) => <tr key={row.client_id}>
          <td><input aria-label={`选择第 ${row.row_number} 行`} type="checkbox" checked={selected.has(row.client_id)} onChange={() => props.setSelected((current) => { const next = new Set(current); if (next.has(row.client_id)) next.delete(row.client_id); else next.add(row.client_id); return next; })} /></td>
          <td><strong>{row.source_label || "未标注"}</strong><small>{row.attempted_on ?? row.attempted_on_raw}</small></td>
          <td className="question">{row.question_text}</td>
          <td>{row.user_answer ?? <Badge tone="orange">未作答</Badge>}</td>
          <td><strong>{row.correct_answer}</strong></td>
          <td>{row.question_type_hint ? <Badge>{questionTypeLabel(row.question_type_hint)}</Badge> : <span className="muted">待 AI 判断</span>}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="card-foot"><div><ShieldCheck />原文件留在浏览器，仅发送选中的标准化文本。</div><button className="primary" disabled={Boolean(report.blocking_errors.length) || !selected.size || busy === "analyze"} onClick={() => void props.analyze()}>{busy === "analyze" ? <LoaderCircle className="spin" /> : <Sparkles />}生成分析草稿<ChevronRight /></button></div>
    </div> : null}
  </section>;
}

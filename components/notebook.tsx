import { ChevronRight, Cloud, Download, NotebookTabs, Pencil, RefreshCw, Search, Save, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { deleteLocalMistake, importLocalMistakes, updateLocalMistake } from "@/lib/local-store";
import { CAUSES, TAXONOMY_VERSION, causeLabel, questionTypeLabel } from "@/lib/taxonomy";
import type { AnalysisDraft, MistakeRecord } from "@/lib/types";
import { Badge, Empty, Intro } from "./ui";

function draftFromItem(item: MistakeRecord): AnalysisDraft {
  return {
    client_id: item.client_id,
    question_type: item.question_type,
    primary_cause: item.primary_cause,
    secondary_causes: item.secondary_causes,
    answer_comparison: item.answer_comparison,
    evidence_span: item.evidence_span,
    trap_mechanism: item.trap_mechanism,
    diagnostic_question: item.diagnostic_question,
    confidence: item.confidence,
    provenance: item.provenance ?? ["user_confirmation"]
  };
}

export function matchesCauseFilter(item: MistakeRecord, causeFilter: string): boolean {
  if (!causeFilter) return true;
  return item.primary_cause === causeFilter || item.secondary_causes.includes(causeFilter);
}

export function Notebook({ items, reload, userKey, causeFilter = "", onCauseFilterChange, restoreCloud, restoringCloud = false }: {
  items: MistakeRecord[];
  reload: () => Promise<void>;
  userKey: string;
  causeFilter?: string;
  onCauseFilterChange?: (value: string) => void;
  restoreCloud?: () => Promise<void>;
  restoringCloud?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AnalysisDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = useMemo(() => items.filter((item) =>
    (!search || `${item.source_label} ${item.question_text}`.toLowerCase().includes(search.toLowerCase())) &&
    (!module || item.module === module) &&
    matchesCauseFilter(item, causeFilter)
  ), [items, search, module, causeFilter]);

  function startEdit(item: MistakeRecord) {
    setError(null); setEditingId(item.id); setEditDraft(draftFromItem(item));
  }
  async function saveEdit() {
    if (!editingId || !editDraft) return;
    setBusyId(editingId); setError(null);
    try {
      await updateLocalMistake(userKey, editingId, editDraft);
      setEditingId(null); setEditDraft(null); await reload();
    } catch (err) { setError(err instanceof Error ? err.message : "保存失败"); }
    finally { setBusyId(null); }
  }
  async function remove(item: MistakeRecord) {
    if (!window.confirm(`确定删除“${item.source_label}”这条已确认错题吗？删除后不可恢复。`)) return;
    setBusyId(item.id); setError(null);
    try { await deleteLocalMistake(userKey, item.id); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : "删除失败"); }
    finally { setBusyId(null); }
  }
  function exportBackup() {
    const payload = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), records: items }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `ielts-error-lab-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function importBackup(file: File) {
    setError(null);
    try {
      const payload = JSON.parse(await file.text()) as { records?: unknown };
      if (!Array.isArray(payload.records)) throw new Error("备份文件格式不正确");
      const count = await importLocalMistakes(userKey, payload.records as MistakeRecord[]);
      await reload(); setError(`已导入 ${count} 条本地记录`);
    } catch (err) { setError(err instanceof Error ? err.message : "备份导入失败"); }
  }
  const backupInput = useRef<HTMLInputElement>(null);

  return <section>
    <Intro kicker="MISTAKE NOTEBOOK" title="不是答案仓库，而是可检索的决策记录。" body="同一道题再次出现会保留新的作答，便于观察错误是否真正消失。" action={<div className="notebook-tools"><button className="ghost" onClick={() => void reload()}><RefreshCw />刷新</button>{restoreCloud && <button className="ghost" disabled={restoringCloud} onClick={() => void restoreCloud()}><Cloud />{restoringCloud ? "恢复中…" : "恢复旧云端记录"}</button>}<button className="ghost" onClick={exportBackup}><Download />导出备份</button><button className="ghost" onClick={() => backupInput.current?.click()}><Upload />导入备份</button><input ref={backupInput} type="file" accept="application/json" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void importBackup(file); e.currentTarget.value = ""; }} /></div>} />
    {error && <div className="warning">{error}</div>}
    <div className="card filters"><Search /><input placeholder="搜索题目或剑雅来源…" value={search} onChange={(e) => setSearch(e.target.value)} /><select value={module} onChange={(e) => setModule(e.target.value)}><option value="">全部模块</option><option value="reading">阅读</option><option value="listening">听力</option></select><select aria-label="按错因筛选" value={causeFilter} onChange={(e) => onCauseFilterChange?.(e.target.value)}><option value="">全部错因</option>{Object.entries(CAUSES).map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select>{causeFilter && <div className="filter-summary">当前错因：<strong>{causeLabel(causeFilter)}</strong> · 仅显示 {visible.length} 题<button type="button" className="ghost small" onClick={() => onCauseFilterChange?.("")}>清除筛选</button></div>}</div>
    {!visible.length ? <Empty icon={NotebookTabs} title="没有匹配的错题" body="确认第一条分析后，这里会保留题目、作答、证据与训练规则。" /> :
      <div className="mistake-grid">{visible.map((item) => {
        const isEditing = editingId === item.id && editDraft;
        return <article className="card pad mistake" key={item.id}>
          <div className="badge-line"><Badge tone={item.module === "reading" ? "green" : "orange"}>{item.module === "reading" ? "阅读" : "听力"}</Badge><Badge>{questionTypeLabel(item.question_type)}</Badge><div className="mistake-actions"><button className="ghost small" disabled={busyId === item.id} onClick={() => startEdit(item)}><Pencil />修改</button><button className="danger small" disabled={busyId === item.id} onClick={() => void remove(item)}><Trash2 />删除</button></div></div>
          <small>{item.source_label} · {item.attempted_on ?? "日期待确认"}</small><h3>{item.question_text}</h3>
          <div className="answers"><span>你的答案<strong>{item.user_answer ?? "未作答"}</strong></span><ChevronRight /><span>正确答案<strong>{item.correct_answer}</strong></span></div>
          {isEditing ? <div className="edit-fields">
            <label><span>主要错因</span><select value={editDraft.primary_cause} onChange={(e) => setEditDraft({ ...editDraft, primary_cause: e.target.value, secondary_causes: editDraft.secondary_causes.filter((code) => code !== e.target.value) })}>{Object.entries(CAUSES).map(([code, label]) => <option value={code} key={code}>{code} · {label}</option>)}</select></label>
            {[0, 1].map((slot) => <label key={slot}><span>次要错因 {slot + 1}</span><select value={editDraft.secondary_causes[slot] ?? ""} onChange={(e) => { const next = [...editDraft.secondary_causes]; if (e.target.value) next[slot] = e.target.value; else next.splice(slot, 1); setEditDraft({ ...editDraft, secondary_causes: [...new Set(next.filter((code) => code && code !== editDraft.primary_cause))].slice(0, 2) }); }}><option value="">不设置</option>{Object.entries(CAUSES).filter(([code]) => code !== editDraft.primary_cause).map(([code, label]) => <option value={code} key={code}>{code} · {label}</option>)}</select></label>)}
            <label className="wide"><span>关键证据</span><textarea value={editDraft.evidence_span} onChange={(e) => setEditDraft({ ...editDraft, evidence_span: e.target.value })} /></label>
            <label className="wide"><span>陷阱机制</span><textarea value={editDraft.trap_mechanism} onChange={(e) => setEditDraft({ ...editDraft, trap_mechanism: e.target.value })} /></label>
            <div className="edit-actions"><button className="ghost" onClick={() => { setEditingId(null); setEditDraft(null); }}><X />取消</button><button className="primary" disabled={busyId === item.id || !editDraft.trap_mechanism.trim()} onClick={() => void saveEdit()}><Save />保存修改</button></div>
          </div> : <>
            <div className="cause"><span>主要错因</span><strong>{causeLabel(item.primary_cause)}</strong><code>{item.primary_cause}</code></div>
            <div className="all-causes"><span>全部错因</span><div><Badge tone="orange">主要 · {causeLabel(item.primary_cause)}</Badge>{item.secondary_causes.map((code) => <Badge key={code}>次要 · {causeLabel(code)}</Badge>)}</div></div>
            {item.trap_mechanism && <div className="trap-note"><span>陷阱机制</span><p>{item.trap_mechanism}</p></div>}
          </>}
        </article>;
      })}</div>}
    <small className="notebook-version">分类 v{TAXONOMY_VERSION} · 修改后会保留最新确认版本</small>
  </section>;
}

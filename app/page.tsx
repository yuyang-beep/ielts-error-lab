"use client";

import { BrainCircuit, BookOpenCheck, LayoutDashboard, NotebookTabs, Settings, ShieldCheck, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ImportCenter } from "@/components/import-center";
import { ReviewQueue } from "@/components/review-queue";
import { Notebook } from "@/components/notebook";
import { Insights } from "@/components/insights";
import { SettingsPanel } from "@/components/settings-panel";
import type { AnalysisDraft, ImportReport, InsightData, IELTSModule, MistakeRecord, PendingAnalysis } from "@/lib/types";
import { parseWorkbook } from "@/lib/xlsx-parser";

type Section = "import" | "review" | "notebook" | "insights" | "settings";
type ConfigStatus = { deepseek_configured: boolean; model: string; taxonomy_version: string; database_configured: boolean };

const nav = [
  { id: "import" as const, label: "导入中心", icon: UploadCloud },
  { id: "review" as const, label: "待确认分析", icon: BookOpenCheck },
  { id: "notebook" as const, label: "错题本", icon: NotebookTabs },
  { id: "insights" as const, label: "洞察面板", icon: LayoutDashboard },
  { id: "settings" as const, label: "设置", icon: Settings }
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "请求失败");
  return payload;
}

export default function Home() {
  const [section, setSection] = useState<Section>("import");
  const [file, setFile] = useState<File | null>(null);
  const [moduleChoice, setModuleChoice] = useState<IELTSModule | "">("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAnalysis[]>([]);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const loadConfig = useCallback(async () => {
    try { setConfig(await api<ConfigStatus>("/api/config/status")); } catch { /* non-blocking */ }
  }, []);
  const loadMistakes = useCallback(async () => {
    try { setMistakes((await api<{ items: MistakeRecord[] }>("/api/mistakes")).items); }
    catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "错题本加载失败" }); }
  }, []);
  const loadInsights = useCallback(async () => {
    try { setInsights(await api<InsightData>("/api/insights")); }
    catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "洞察加载失败" }); }
  }, []);

  useEffect(() => { queueMicrotask(() => void loadConfig()); }, [loadConfig]);
  useEffect(() => {
    queueMicrotask(() => {
      if (section === "notebook") void loadMistakes();
      if (section === "insights") void loadInsights();
    });
  }, [section, loadMistakes, loadInsights]);

  async function readFile(nextFile: File, chosen?: IELTSModule) {
    setBusy("parse"); setMessage(null);
    try {
      const next = await parseWorkbook(nextFile, chosen);
      setFile(nextFile); setReport(next);
      if (next.inferred_module) setModuleChoice(next.inferred_module);
      setSelected(new Set(next.rows.filter((row) => row.question_text && row.correct_answer).map((row) => row.client_id)));
    } catch (error) {
      setReport(null);
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "文件解析失败" });
    } finally { setBusy(null); }
  }

  async function analyze() {
    if (!report) return;
    const rows = report.rows.filter((row) => selected.has(row.client_id));
    if (!rows.length) return setMessage({ tone: "error", text: "请至少选择一道有效错题" });
    setBusy("analyze"); setMessage(null);
    try {
      const { drafts } = await api<{ drafts: AnalysisDraft[] }>("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows })
      });
      const rowMap = new Map(rows.map((row) => [row.client_id, row]));
      const additions = drafts.flatMap((draft) => {
        const row = rowMap.get(draft.client_id);
        return row ? [{ row, draft, source_url: sourceUrl, file_name: report.file_name, file_hash: report.file_hash }] : [];
      });
      setPending((current) => {
        const ids = new Set(additions.map((item) => item.row.client_id));
        return [...current.filter((item) => !ids.has(item.row.client_id)), ...additions];
      });
      setMessage({ tone: "ok", text: `已生成 ${additions.length} 条草稿，请核对后入库` });
      setSection("review");
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "分析失败" });
    } finally { setBusy(null); }
  }

  function updateDraft(clientId: string, patch: Partial<AnalysisDraft>) {
    setPending((items) => items.map((item) =>
      item.row.client_id === clientId ? { ...item, draft: { ...item.draft, ...patch } } : item
    ));
  }

  async function confirm(items: PendingAnalysis[]) {
    setBusy("confirm"); setMessage(null);
    try {
      const result = await api<{ inserted: number; skipped: number }>("/api/analyses/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items })
      });
      const ids = new Set(items.map((item) => item.row.client_id));
      setPending((current) => current.filter((item) => !ids.has(item.row.client_id)));
      setMessage({ tone: "ok", text: `已保存 ${result.inserted} 条${result.skipped ? `，跳过 ${result.skipped} 条重复记录` : ""}` });
      await Promise.all([loadMistakes(), loadInsights()]);
      setSection("notebook");
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "确认入库失败" });
    } finally { setBusy(null); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><BrainCircuit /></div><div><strong>IELTS 错因实验室</strong><span>Evidence before labels</span></div></div>
      <nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? "nav-item active" : "nav-item"} onClick={() => setSection(id)}><Icon /><span>{label}</span>{id === "review" && pending.length > 0 && <em>{pending.length}</em>}</button>)}</nav>
      <div className="sidebar-note"><ShieldCheck /><div><strong>浏览器内解析</strong><span>XLSX 原文件不会上传</span></div></div>
    </aside>
    <main>
      <header className="topbar"><div><span>PERSONAL LEARNING SYSTEM</span><h1>{nav.find((item) => item.id === section)?.label}</h1></div><div className="api-state"><i className={config?.deepseek_configured ? "online" : ""} />DeepSeek {config?.deepseek_configured ? "已连接" : "待配置"}</div></header>
      {message && <div className={`toast ${message.tone}`}><span>{message.text}</span><button onClick={() => setMessage(null)}>×</button></div>}
      <div className="content">
        {section === "import" && <ImportCenter {...{ file, moduleChoice, sourceUrl, report, selected, busy }} setSourceUrl={setSourceUrl} setModuleChoice={setModuleChoice} setSelected={setSelected} readFile={readFile} analyze={analyze} />}
        {section === "review" && <ReviewQueue items={pending} busy={busy} updateDraft={updateDraft} remove={(id) => setPending((items) => items.filter((item) => item.row.client_id !== id))} confirm={confirm} />}
        {section === "notebook" && <Notebook items={mistakes} reload={loadMistakes} />}
        {section === "insights" && <Insights data={insights} />}
        {section === "settings" && <SettingsPanel config={config} />}
      </div>
    </main>
  </div>;
}

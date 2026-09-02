import { ChevronRight, NotebookTabs, RefreshCw, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { CAUSES, causeLabel, questionTypeLabel } from "@/lib/taxonomy";
import type { MistakeRecord } from "@/lib/types";
import { Badge, Empty, Intro } from "./ui";

export function Notebook({ items, reload }: { items: MistakeRecord[]; reload: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [cause, setCause] = useState("");
  const visible = useMemo(() => items.filter((item) =>
    (!search || `${item.source_label} ${item.question_text}`.toLowerCase().includes(search.toLowerCase())) &&
    (!module || item.module === module) &&
    (!cause || item.primary_cause === cause || item.secondary_causes.includes(cause))
  ), [items, search, module, cause]);
  return <section>
    <Intro kicker="MISTAKE NOTEBOOK" title="不是答案仓库，而是可检索的决策记录。" body="同一道题再次出现会保留新的作答，便于观察错误是否真正消失。" action={<button className="ghost" onClick={() => void reload()}><RefreshCw />刷新</button>} />
    <div className="card filters"><Search /><input placeholder="搜索题目或剑雅来源…" value={search} onChange={(e) => setSearch(e.target.value)} /><select value={module} onChange={(e) => setModule(e.target.value)}><option value="">全部模块</option><option value="reading">阅读</option><option value="listening">听力</option></select><select value={cause} onChange={(e) => setCause(e.target.value)}><option value="">全部根因</option>{Object.entries(CAUSES).map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></div>
    {!visible.length ? <Empty icon={NotebookTabs} title="没有匹配的错题" body="确认第一条分析后，这里会保留题目、作答、证据与训练规则。" /> :
      <div className="mistake-grid">{visible.map((item) => <article className="card pad mistake" key={item.id}>
        <div className="badge-line"><Badge tone={item.module === "reading" ? "green" : "orange"}>{item.module === "reading" ? "阅读" : "听力"}</Badge><Badge>{questionTypeLabel(item.question_type)}</Badge></div>
        <small>{item.source_label} · {item.attempted_on ?? "日期待确认"}</small><h3>{item.question_text}</h3>
        <div className="answers"><span>你的答案<strong>{item.user_answer ?? "未作答"}</strong></span><ChevronRight /><span>正确答案<strong>{item.correct_answer}</strong></span></div>
        <div className="cause"><span>主要根因</span><strong>{causeLabel(item.primary_cause)}</strong><code>{item.primary_cause}</code></div>
        <p>{item.reasoning_chain}</p>{item.trap_mechanism && <div className="trap-note"><span>陷阱机制</span><p>{item.trap_mechanism}</p></div>}<div className="rule"><Sparkles /><div><span>下次规则</span><p>{item.remediation_rule}</p></div></div>
      </article>)}</div>}
  </section>;
}

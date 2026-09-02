import { BookOpenCheck, Check, CircleAlert, LoaderCircle } from "lucide-react";
import { CAUSES, QUESTION_TYPES, TAXONOMY_VERSION } from "@/lib/taxonomy";
import type { AnalysisDraft, PendingAnalysis } from "@/lib/types";
import { Badge, Empty, Intro } from "./ui";

export function ReviewQueue({ items, busy, updateDraft, remove, confirm }: {
  items: PendingAnalysis[];
  busy: string | null;
  updateDraft: (id: string, patch: Partial<AnalysisDraft>) => void;
  remove: (id: string) => void;
  confirm: (items: PendingAnalysis[]) => Promise<void>;
}) {
  return <section>
    <Intro kicker="HUMAN IN THE LOOP" title="AI 提出假设，你确认真实发生了什么。" body="先核对证据和逻辑，再修改根因。注意力、时间、工作记忆等主观原因只能来自你的笔记或明确确认。" action={items.length ? <button className="primary" disabled={busy === "confirm"} onClick={() => void confirm(items)}>{busy === "confirm" ? <LoaderCircle className="spin" /> : <Check />}确认全部并入库</button> : undefined} />
    {!items.length ? <Empty icon={BookOpenCheck} title="没有待确认草稿" body="从导入中心选择错题并生成分析，草稿会先来到这里。" /> :
      <div className="review-list">{items.map((item, index) => <article className="card pad review" key={item.row.client_id}>
        <div className="review-title"><b>{String(index + 1).padStart(2, "0")}</b><div><div className="badge-line"><Badge tone="green">{item.row.module === "reading" ? "阅读" : "听力"}</Badge><Badge>{item.row.source_label}</Badge>{item.row.answer_state === "unanswered" && <Badge tone="orange">未作答</Badge>}</div><h3>{item.row.question_text}</h3></div></div>
        <div className="evidence"><span>原文证据</span><p>{item.row.evidence_context || "导出数据未提供原文证据。"}</p><div>我的答案 <strong>{item.row.user_answer ?? "未作答"}</strong> · 正确答案 <strong>{item.row.correct_answer}</strong></div></div>
        {item.draft.status === "manual_required" && <div className="warning"><CircleAlert />AI 未能生成合法分析，已安全转为手工判断：{item.draft.error}</div>}
        <div className="fields two">
          <label><span>题型</span><select value={item.draft.question_type} onChange={(e) => updateDraft(item.row.client_id, { question_type: e.target.value })}>{Object.entries(QUESTION_TYPES[item.row.module]).map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
          <label><span>主要根因</span><select value={item.draft.primary_cause} onChange={(e) => updateDraft(item.row.client_id, { primary_cause: e.target.value })}>{Object.entries(CAUSES).map(([code, label]) => <option value={code} key={code}>{code} · {label}</option>)}</select></label>
          <label className="wide"><span>关键证据</span><textarea value={item.draft.evidence_span} onChange={(e) => updateDraft(item.row.client_id, { evidence_span: e.target.value })} /></label>
          <label className="wide"><span>推理链</span><textarea value={item.draft.reasoning_chain} onChange={(e) => updateDraft(item.row.client_id, { reasoning_chain: e.target.value })} /></label>
          <label><span>陷阱机制</span><textarea value={item.draft.trap_mechanism} onChange={(e) => updateDraft(item.row.client_id, { trap_mechanism: e.target.value })} /></label>
          <label><span>诊断问题</span><textarea value={item.draft.diagnostic_question} onChange={(e) => updateDraft(item.row.client_id, { diagnostic_question: e.target.value })} /></label>
          <label><span>纠正规则</span><textarea value={item.draft.remediation_rule} onChange={(e) => updateDraft(item.row.client_id, { remediation_rule: e.target.value })} /></label>
          <label><span>微型训练</span><textarea value={item.draft.micro_drill} onChange={(e) => updateDraft(item.row.client_id, { micro_drill: e.target.value })} /></label>
        </div>
        <div className="review-foot"><span>AI 置信度 <strong>{Math.round(item.draft.confidence * 100)}%</strong> · 分类 v{TAXONOMY_VERSION}</span><div><button className="ghost" onClick={() => remove(item.row.client_id)}>暂不处理</button><button className="primary small" disabled={busy === "confirm"} onClick={() => void confirm([item])}><Check />确认这一条</button></div></div>
      </article>)}</div>}
  </section>;
}

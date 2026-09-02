import { BookOpenCheck, Check, CircleAlert, LoaderCircle } from "lucide-react";
import { CAUSES, QUESTION_TYPES, TAXONOMY_VERSION } from "@/lib/taxonomy";
import { getCauseCandidates, isMeaningfulEvidence } from "@/lib/cause-guidance";
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
        {isMeaningfulEvidence(item.row.source_analysis) && <div className="source-analysis"><span>爱听写解析</span><p>{item.row.source_analysis}</p></div>}
        {(isMeaningfulEvidence(item.row.source_note) || item.row.source_tags.some(isMeaningfulEvidence)) && <div className="learner-evidence"><strong>你的笔记证据</strong><span>{[item.row.source_note, ...item.row.source_tags].filter(isMeaningfulEvidence).join(" · ")}</span></div>}
        {item.draft.status === "manual_required" && <div className="warning"><CircleAlert />AI 响应暂时失败，已保留证据、陷阱分析和候选错因，请完成确认：{item.draft.error}</div>}
        <div className="fields two">
          <label><span>题型</span><select value={item.draft.question_type} onChange={(e) => updateDraft(item.row.client_id, { question_type: e.target.value })}>{Object.entries(QUESTION_TYPES[item.row.module]).map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
          <label><span>主要根因</span><select value={item.draft.primary_cause} onChange={(e) => updateDraft(item.row.client_id, { primary_cause: e.target.value, secondary_causes: item.draft.secondary_causes.filter((code) => code !== e.target.value) })}>{Object.entries(CAUSES).map(([code, label]) => <option value={code} key={code}>{code} · {label}</option>)}</select></label>
          {[0, 1].map((slot) => <label key={slot}><span>次要根因 {slot + 1} <em>可选</em></span><select value={item.draft.secondary_causes[slot] ?? ""} onChange={(e) => {
            const next = [...item.draft.secondary_causes];
            if (e.target.value) next[slot] = e.target.value;
            else next.splice(slot, 1);
            updateDraft(item.row.client_id, { secondary_causes: [...new Set(next.filter((code) => code && code !== item.draft.primary_cause))].slice(0, 2) });
          }}><option value="">不设置</option>{Object.entries(CAUSES).filter(([code]) => code !== item.draft.primary_cause).map(([code, label]) => <option value={code} key={code}>{code} · {label}</option>)}</select></label>)}
          <div className="cause-suggestions wide"><div><strong>本题常见错因候选</strong><span>根据题型、爱听写证据与有效标签生成；候选不是结论，请结合自己的作答过程确认。</span></div><div>{getCauseCandidates(item.row, item.draft.question_type).map((candidate) => {
            const primary = item.draft.primary_cause === candidate.code;
            const secondary = item.draft.secondary_causes.includes(candidate.code);
            return <article className={primary || secondary ? "cause-candidate selected" : "cause-candidate"} key={candidate.code}><header><strong>{candidate.label}</strong><code>{candidate.code}</code></header><p>{candidate.checkpoint}</p><footer><button type="button" className={primary ? "active" : ""} onClick={() => updateDraft(item.row.client_id, { primary_cause: candidate.code, secondary_causes: item.draft.secondary_causes.filter((code) => code !== candidate.code) })}>{primary ? "已设为主要" : "设为主要"}</button><button type="button" className={secondary ? "active" : ""} disabled={!secondary && item.draft.secondary_causes.length >= 2} onClick={() => updateDraft(item.row.client_id, { secondary_causes: secondary ? item.draft.secondary_causes.filter((code) => code !== candidate.code) : [...item.draft.secondary_causes.filter((code) => code !== candidate.code && code !== item.draft.primary_cause), candidate.code].slice(0, 2) })}>{secondary ? "移除次要" : "设为次要"}</button></footer></article>;
          })}</div></div>
          <label className="wide"><span>关键证据</span><textarea value={item.draft.evidence_span} onChange={(e) => updateDraft(item.row.client_id, { evidence_span: e.target.value })} /></label>
          <label className="wide"><span>推理链</span><textarea value={item.draft.reasoning_chain} onChange={(e) => updateDraft(item.row.client_id, { reasoning_chain: e.target.value })} /></label>
          <label className="wide"><span>陷阱机制 <em>AI 必须交付</em></span><textarea value={item.draft.trap_mechanism} onChange={(e) => updateDraft(item.row.client_id, { trap_mechanism: e.target.value })} /></label>
          <label><span>诊断问题</span><textarea value={item.draft.diagnostic_question} onChange={(e) => updateDraft(item.row.client_id, { diagnostic_question: e.target.value })} /></label>
          <label><span>纠正规则</span><textarea value={item.draft.remediation_rule} onChange={(e) => updateDraft(item.row.client_id, { remediation_rule: e.target.value })} /></label>
        </div>
        <div className="review-foot"><span>AI 置信度 <strong>{Math.round(item.draft.confidence * 100)}%</strong> · 分类 v{TAXONOMY_VERSION}</span><div><button className="ghost" onClick={() => remove(item.row.client_id)}>暂不处理</button><button className="primary small" disabled={busy === "confirm"} onClick={() => void confirm([item])}><Check />确认这一条</button></div></div>
      </article>)}</div>}
  </section>;
}

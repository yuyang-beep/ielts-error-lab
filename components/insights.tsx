import { BarChart3, ChevronRight, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { buildLocalInsights } from "@/lib/local-insights";
import { causeLabel, questionTypeLabel } from "@/lib/taxonomy";
import type { InsightData, MistakeRecord } from "@/lib/types";
import { Badge, Empty, Intro } from "./ui";

function moduleLabel(code: string) {
  return code === "reading" ? "阅读" : code === "listening" ? "听力" : code;
}

function typeLabel(code: string) {
  const moduleName = code.startsWith("R_") ? "阅读" : code.startsWith("L_") ? "听力" : "";
  return moduleName ? `${moduleName} · ${questionTypeLabel(code)}` : questionTypeLabel(code);
}

export function Insights({ data, items = [], onSelectCause }: { data: InsightData | null; items?: MistakeRecord[]; onSelectCause?: (cause: string) => void }) {
  const [moduleFilter, setModuleFilter] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState("");
  const questionTypes = useMemo(() => [...new Set(items.filter((item) => !moduleFilter || item.module === moduleFilter).map((item) => item.question_type))].sort(), [items, moduleFilter]);
  const filteredItems = useMemo(() => items.filter((item) => (!moduleFilter || item.module === moduleFilter) && (!questionTypeFilter || item.question_type === questionTypeFilter)), [items, moduleFilter, questionTypeFilter]);
  const view = items.length || moduleFilter || questionTypeFilter ? buildLocalInsights(filteredItems) : data;
  const max = Math.max(1, ...(view?.by_cause.map((item) => item.count) ?? [1]));
  const hasFilters = Boolean(moduleFilter || questionTypeFilter);
  return <section>
    <Intro kicker="PATTERN OVER TIME" title="分析长期训练，梳理高频错因" />
    <div className="card insight-filters"><Filter /><label><span>模块</span><select value={moduleFilter} onChange={(event) => { setModuleFilter(event.target.value); setQuestionTypeFilter(""); }}><option value="">全部模块</option><option value="reading">阅读</option><option value="listening">听力</option></select></label><label><span>官方题型</span><select value={questionTypeFilter} onChange={(event) => setQuestionTypeFilter(event.target.value)}><option value="">全部题型</option>{questionTypes.map((code) => <option value={code} key={code}>{typeLabel(code)}</option>)}</select></label>{hasFilters && <button type="button" className="ghost small" onClick={() => { setModuleFilter(""); setQuestionTypeFilter(""); }}>清除筛选</button>}<small>{hasFilters ? `当前显示 ${view?.total_attempts ?? 0} 条记录` : "按模块和爱听写官方题型查看长期模式"}</small></div>
    {!view?.total_attempts ? <Empty icon={BarChart3} title={hasFilters ? "当前筛选无记录" : "还没有足够的数据"} body={hasFilters ? "请调整模块或题型筛选条件。" : "确认错题分析后，这里会生成模块、官方题型、错因和交叉矩阵。"} /> : <>
      <div className="summary"><div className="card pad"><span>收录错题数量</span><strong>{view.total_attempts}</strong><small>条已确认错题</small></div><button className="card pad insight-summary-button" onClick={() => view.by_cause[0] && onSelectCause?.(view.by_cause[0].label)}><span>当前高频错因</span><h3>{causeLabel(view.by_cause[0]?.label)}</h3><small>{view.by_cause[0]?.count} 次 · 点击查看全部题目</small></button><div className="card pad"><span>高频题型</span><h3>{typeLabel(view.by_question_type[0]?.label)}</h3><small>{view.by_question_type[0]?.count} 次确认记录</small></div></div>
      <div className="card pad module-breakdown"><div className="card-head"><div><span>MODULES</span><h3>阅读与听力划分</h3></div></div><div className="module-breakdown-grid">{view.by_module.map((item) => <div key={item.label}><span>{moduleLabel(item.label)}</span><strong>{item.count}</strong></div>)}</div></div>
      <div className="charts">
        <div className="card pad"><div className="card-head"><div><span>ERROR CAUSES</span><h3>错因分布</h3></div><small>点击错因查看全部题目</small></div><div className="bars">{view.by_cause.map((item) => <button className="insight-bar" key={item.label} onClick={() => onSelectCause?.(item.label)}><span>{causeLabel(item.label)}</span><i><b style={{ width: `${Math.max(7, item.count / max * 100)}%` }} /></i><strong>{item.count}</strong></button>)}</div></div>
        <div className="card pad"><div className="card-head"><div><span>OFFICIAL QUESTION TYPES</span><h3>官方题型分布</h3></div></div><div className="legend">{view.by_question_type.map((item) => <div key={item.label}><i className={item.label.startsWith("L_") ? "listening-dot" : "reading-dot"} /><span>{typeLabel(item.label)}</span><strong>{item.count}</strong></div>)}</div></div>
      </div>
      <div className="card pad matrix"><div className="card-head"><div><span>CROSS ANALYSIS</span><h3>官方题型 × 错因高频组合</h3></div></div><div>{view.matrix.slice().sort((a, b) => b.count - a.count).slice(0, 12).map((item) => <button className="matrix-row" key={`${item.question_type}-${item.cause}`} onClick={() => onSelectCause?.(item.cause)}><span>{typeLabel(item.question_type)}</span><ChevronRight /><strong>{causeLabel(item.cause)}</strong><Badge tone="orange">{item.count} 次 · 查看</Badge></button>)}</div></div>
    </>}
  </section>;
}
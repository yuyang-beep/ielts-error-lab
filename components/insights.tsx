import { BarChart3, ChevronRight } from "lucide-react";
import { causeLabel, questionTypeLabel } from "@/lib/taxonomy";
import type { InsightData } from "@/lib/types";
import { Badge, Empty, Intro } from "./ui";

export function Insights({ data, onSelectCause }: { data: InsightData | null; onSelectCause?: (cause: string) => void }) {
  const max = Math.max(1, ...(data?.by_cause.map((item) => item.count) ?? [1]));
  return <section>
    <Intro kicker="PATTERN OVER TIME" title="让长期模式，而不是单次分数，决定训练重点。" body="所有图表只使用你亲自确认过的分类。" />
    {!data?.total_attempts ? <Empty icon={BarChart3} title="还没有足够的数据" body="确认错题分析后，这里会生成题型、错因、交叉矩阵和时间趋势。" /> : <>
      <div className="summary"><div className="card pad"><span>已确认作答</span><strong>{data.total_attempts}</strong><small>次独立练习记录</small></div><button className="card pad insight-summary-button" onClick={() => data.by_cause[0] && onSelectCause?.(data.by_cause[0].label)}><span>当前高频错因</span><h3>{causeLabel(data.by_cause[0]?.label)}</h3><small>{data.by_cause[0]?.count} 次 · 点击查看全部题目</small></button><div className="card pad"><span>高频题型</span><h3>{questionTypeLabel(data.by_question_type[0]?.label)}</h3><small>{data.by_question_type[0]?.count} 次确认记录</small></div></div>
      <div className="charts">
        <div className="card pad"><div className="card-head"><div><span>ERROR CAUSES</span><h3>错因分布</h3></div><small>点击错因查看全部题目</small></div><div className="bars">{data.by_cause.map((item) => <button className="insight-bar" key={item.label} onClick={() => onSelectCause?.(item.label)}><span>{causeLabel(item.label)}</span><i><b style={{ width: `${Math.max(7, item.count / max * 100)}%` }} /></i><strong>{item.count}</strong></button>)}</div></div>
        <div className="card pad"><div className="card-head"><div><span>QUESTION TYPES</span><h3>题型分布</h3></div></div><div className="legend">{data.by_question_type.map((item) => <div key={item.label}><i /><span>{questionTypeLabel(item.label)}</span><strong>{item.count}</strong></div>)}</div></div>
      </div>
      <div className="card pad matrix"><div className="card-head"><div><span>CROSS ANALYSIS</span><h3>题型 × 错因高频组合</h3></div></div><div>{data.matrix.sort((a, b) => b.count - a.count).slice(0, 12).map((item) => <button className="matrix-row" key={`${item.question_type}-${item.cause}`} onClick={() => onSelectCause?.(item.cause)}><span>{questionTypeLabel(item.question_type)}</span><ChevronRight /><strong>{causeLabel(item.cause)}</strong><Badge tone="orange">{item.count} 次 · 查看</Badge></button>)}</div></div>
    </>}
  </section>;
}

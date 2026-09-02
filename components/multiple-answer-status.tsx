import { Check, CircleAlert, Minus } from "lucide-react";
import { compareMultipleAnswers } from "@/lib/answer-comparison";

export function MultipleAnswerStatus({ userAnswer, correctAnswer }: { userAnswer: string | null; correctAnswer: string }) {
  const comparison = compareMultipleAnswers(userAnswer, correctAnswer);
  return <div className="multi-answer-status">
    <div className="multi-answer-head"><strong>双选题逐项核对</strong><span>绿色：已选且正确 · 红色：已选但错误 · 橙色：正确但漏选</span></div>
    <div className="multi-answer-columns">
      <div><span>你的选择</span><div className="answer-chips">{comparison.user.length ? comparison.user.map((token) => comparison.matched.includes(token)
        ? <b className="answer-chip correct" key={token}><Check />{token}</b>
        : <b className="answer-chip wrong" key={token}><CircleAlert />{token}</b>) : <em>未作答</em>}</div></div>
      <div><span>正确选项</span><div className="answer-chips">{comparison.correct.map((token) => comparison.matched.includes(token)
        ? <b className="answer-chip correct" key={token}><Check />{token}</b>
        : <b className="answer-chip missed" key={token}><Minus />{token}</b>)}</div></div>
    </div>
    {comparison.matched.length > 0 && <p className="answer-overlap">重叠选项：<strong>{comparison.matched.join("、")}</strong>（已选且正确）</p>}
  </div>;
}

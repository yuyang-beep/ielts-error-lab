import type { LucideIcon } from "lucide-react";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "orange" | "red" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Empty({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return <div className="empty"><div><Icon /></div><h3>{title}</h3><p>{body}</p></div>;
}

export function Intro({ kicker, title, body, action }: { kicker: string; title: string; body: string; action?: React.ReactNode }) {
  return <div className="intro"><div><p className="kicker">{kicker}</p><h2>{title}</h2><p>{body}</p></div>{action}</div>;
}

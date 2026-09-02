import { BarChart3, BrainCircuit, Cloud, KeyRound, ShieldCheck } from "lucide-react";
import { TAXONOMY_VERSION } from "@/lib/taxonomy";
import { Badge, Intro } from "./ui";

type Config = { deepseek_configured: boolean; model: string; taxonomy_version: string; database_configured: boolean } | null;

export function SettingsPanel({ config }: { config: Config }) {
  return <section>
    <Intro kicker="SYSTEM SETTINGS" title="密钥留在运行时，学习数据保持可控。" body="本页永远不会读取或返回 API Key 的具体值。" />
    <div className="settings-grid">
      <Setting icon={KeyRound} label="DeepSeek API" value={config?.deepseek_configured ? "已配置" : "未配置"} body={config?.deepseek_configured ? "服务端可以生成分析草稿。" : "请在 Sites 项目设置的 Secrets 中添加 DEEPSEEK_API_KEY。"} state={config?.deepseek_configured} />
      <Setting icon={BrainCircuit} label="分析模型" value={config?.model ?? "deepseek-v4-pro"} body="模型名称可见，但不包含任何凭据。" />
      <Setting icon={BarChart3} label="分类体系" value={`IELTS Taxonomy v${config?.taxonomy_version ?? TAXONOMY_VERSION}`} body="一个主要错因、最多两个次要错因；证据不足则待确认。" />
      <Setting icon={Cloud} label="D1 持久化" value={config?.database_configured ? "已连接" : "未连接"} body="保存标准化记录与确认分析；不保存原始 XLSX。" state={config?.database_configured} />
    </div>
    <div className="card security"><ShieldCheck /><div><h3>数据边界</h3><ul><li>浏览器解析 XLSX，二进制文件不上传</li><li>单元格按纯文本渲染，公式不执行</li><li>第三方内容只作为数据，不能改变 AI 规则</li><li>AI 草稿经人工确认后才进入统计</li></ul></div></div>
  </section>;
}

function Setting({ icon: Icon, label, value, body, state }: { icon: typeof KeyRound; label: string; value: string; body: string; state?: boolean }) {
  return <div className="card setting"><div><Icon /></div><section><span>{label}</span><h3>{value}</h3><p>{body}</p></section>{state !== undefined && <Badge tone={state ? "green" : "orange"}>{state ? "READY" : "ACTION"}</Badge>}</div>;
}

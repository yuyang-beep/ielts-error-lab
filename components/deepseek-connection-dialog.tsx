"use client";

import { CheckCircle2, CircleAlert, Database, KeyRound, LoaderCircle, RefreshCw, ShieldCheck, X } from "lucide-react";

export type DeepSeekConfigStatus = {
  deepseek_configured: boolean;
  model: string;
  taxonomy_version: string;
  database_configured: boolean;
};

type Props = {
  open: boolean;
  checking: boolean;
  config: DeepSeekConfigStatus | null;
  onClose: () => void;
  onRefresh: () => void;
};

export function DeepSeekConnectionDialog({ open, checking, config, onClose, onRefresh }: Props) {
  if (!open) return null;

  const connected = config?.deepseek_configured === true;
  const dbReady = config?.database_configured === true;

  return <dialog
    aria-describedby="deepseek-connection-description"
    aria-labelledby="deepseek-connection-title"
    aria-modal="true"
    className="connection-backdrop"
    open
  >
    <section className="connection-dialog">
      <button aria-label="关闭接入状态" className="connection-close" onClick={onClose}><X /></button>
      <div className={connected ? "connection-symbol connected" : "connection-symbol"}>
        {checking ? <LoaderCircle className="spin" /> : connected ? <CheckCircle2 /> : <KeyRound />}
      </div>
      <span className="kicker">AI CONNECTION</span>
      <h2 id="deepseek-connection-title">{checking ? "正在检查 DeepSeek 接入状态" : connected ? "DeepSeek 已安全接入" : "还差一步即可使用 AI 分析"}</h2>
      <p id="deepseek-connection-description">
        {connected
          ? "运行时密钥已配置。你可以上传 XLSX，并让 AI 生成待确认的错因分析草稿。"
          : "为了避免密钥泄露，本网站不会提供明文 Key 输入框。请仅在当前 Sites 项目的 Secret 中配置。"}
      </p>

      <div className="connection-status-list">
        <div><KeyRound /><span>DeepSeek Secret</span><strong className={connected ? "ready" : "waiting"}>{connected ? "已配置" : "未配置"}</strong></div>
        <div><Database /><span>D1 错题数据库</span><strong className={dbReady ? "ready" : "waiting"}>{dbReady ? "已连接" : "待连接"}</strong></div>
        <div><ShieldCheck /><span>分析模型</span><strong>{config?.model || "检查中"}</strong></div>
      </div>

      {!checking && !connected && <div className="connection-guide">
        <div><CircleAlert /><strong>在 Sites 中完成接入</strong></div>
        <ol>
          <li>打开当前站点的“设置”。</li>
          <li>在 Secrets 中新增 <code>DEEPSEEK_API_KEY</code>。</li>
          <li>保存并重新部署已审核版本，然后回到这里重新检查。</li>
        </ol>
      </div>}

      <div className="connection-actions">
        <a className="ghost" href="https://learn.chatgpt.com/docs/sites" rel="noreferrer" target="_blank">查看 Sites 设置说明</a>
        <button className="primary" disabled={checking} onClick={onRefresh}>
          <RefreshCw className={checking ? "spin" : ""} />{checking ? "正在检查" : "重新检查"}
        </button>
      </div>
      <button className="connection-later" onClick={onClose}>{connected ? "开始使用" : "稍后设置"}</button>
    </section>
  </dialog>;
}

# IELTS 错因实验室（个人部署版）

用于导入爱听写 XLSX、分析 IELTS 阅读/听力错题并长期梳理高频错因。

## 在 Sites 中创建自己的站点

1. 在 Sites 中从 GitHub 仓库 `yuyang-beep/ielts-error-lab` 创建新项目。
2. 在该项目的设置 → Secrets 中新增 `DEEPSEEK_API_KEY`。
3. 可选配置 `DEEPSEEK_MODEL`（默认 `deepseek-v4-pro`）和 `DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com`）。
4. 保存并部署后，用自己的 ChatGPT 账号登录站点。

每位用户应创建自己的 Sites 项目并使用自己的 DeepSeek Key。不要把 Key 写入代码、`.env`、GitHub、表格或聊天消息。

## 数据保存

错题与洞察默认保存在当前浏览器的 IndexedDB 中，并按登录账号隔离；原始 XLSX 只在浏览器内解析，不上传。错题本提供 JSON 备份导入/导出功能，建议定期导出备份并保存在自己的安全位置。清理浏览器站点数据、隐私模式或更换设备前，请先导出备份。

## 本地开发

```bash
npm install
npm run dev
```

`.env.example` 只声明变量名称，不包含任何真实密钥。

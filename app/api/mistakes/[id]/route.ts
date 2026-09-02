import { deleteMistake, listMistakes, updateMistake } from "@/lib/db";
import { runtimeEnv } from "@/lib/runtime";
import { analysisDraftSchema } from "@/lib/schemas";
import { requireAuthenticatedSiteUser } from "@/lib/site-auth";

export const runtime = "edge";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAuthenticatedSiteUser(request);
  if (authError) return authError;
  const config = runtimeEnv();
  if (!config.DB) return Response.json({ error: "D1 数据库未配置" }, { status: 503 });
  const { id } = await context.params;
  const item = (await listMistakes(config.DB, {})).find((record) => record.id === id);
  return item ? Response.json({ item }) : Response.json({ error: "记录不存在" }, { status: 404 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAuthenticatedSiteUser(request);
  if (authError) return authError;
  const config = runtimeEnv();
  if (!config.DB) return Response.json({ error: "D1 数据库未配置" }, { status: 503 });
  const { id } = await context.params;
  try {
    const payload = await request.json() as { draft?: unknown };
    const draft = analysisDraftSchema.parse(payload.draft ?? payload);
    const updated = await updateMistake(config.DB, id, draft);
    if (!updated) return Response.json({ error: "记录不存在或不可修改" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求无效";
    return Response.json({ error: `更新失败：${message}` }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAuthenticatedSiteUser(request);
  if (authError) return authError;
  const config = runtimeEnv();
  if (!config.DB) return Response.json({ error: "D1 数据库未配置" }, { status: 503 });
  const { id } = await context.params;
  const deleted = await deleteMistake(config.DB, id);
  return deleted ? Response.json({ ok: true }) : Response.json({ error: "记录不存在" }, { status: 404 });
}

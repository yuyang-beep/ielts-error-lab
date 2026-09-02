import { listMistakes } from "@/lib/db";
import { runtimeEnv } from "@/lib/runtime";

export const runtime = "edge";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const config = runtimeEnv();
  if (!config.DB) return Response.json({ error: "D1 数据库未配置" }, { status: 503 });
  const { id } = await context.params;
  const item = (await listMistakes(config.DB, {})).find((record) => record.id === id);
  return item ? Response.json({ item }) : Response.json({ error: "记录不存在" }, { status: 404 });
}

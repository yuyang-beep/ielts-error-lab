import { ensureSchema } from "@/lib/db";
import { runtimeEnv } from "@/lib/runtime";

export const runtime = "edge";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const config = runtimeEnv();
  if (!config.DB) return Response.json({ error: "D1 数据库未配置" }, { status: 503 });
  const { id } = await context.params;
  await ensureSchema(config.DB);
  const result = await config.DB.prepare("DELETE FROM import_batches WHERE id = ?").bind(id).run();
  return Response.json({ deleted: result.meta.changes > 0 });
}

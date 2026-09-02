import { confirmAnalyses } from "@/lib/db";
import { runtimeEnv } from "@/lib/runtime";
import { confirmRequestSchema } from "@/lib/schemas";
import { requireAuthenticatedSiteUser } from "@/lib/site-auth";

export const runtime = "edge";

export async function POST(request: Request) {
  const authError = requireAuthenticatedSiteUser(request);
  if (authError) return authError;
  const parsed = confirmRequestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "确认数据不完整", details: parsed.error.flatten() }, { status: 400 });
  const config = runtimeEnv();
  if (!config.DB) return Response.json({ error: "D1 数据库未配置" }, { status: 503 });
  try {
    const result = await confirmAnalyses(config.DB, parsed.data.items, config.DEEPSEEK_MODEL || "deepseek-v4-pro");
    return Response.json(result);
  } catch {
    return Response.json({ error: "数据库事务失败，本次未完成入库" }, { status: 500 });
  }
}

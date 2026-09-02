import { listMistakes } from "@/lib/db";
import { runtimeEnv } from "@/lib/runtime";

export const runtime = "edge";

export async function GET(request: Request) {
  const config = runtimeEnv();
  if (!config.DB) return Response.json({ error: "D1 数据库未配置" }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const items = await listMistakes(config.DB, {
    module: params.get("module") || undefined,
    question_type: params.get("question_type") || undefined,
    cause: params.get("cause") || undefined,
    search: params.get("search")?.slice(0, 100) || undefined
  });
  return Response.json({ items });
}

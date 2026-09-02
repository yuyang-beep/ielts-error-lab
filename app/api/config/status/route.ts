import { runtimeEnv } from "@/lib/runtime";
import { TAXONOMY_VERSION } from "@/lib/taxonomy";

export const runtime = "edge";

export async function GET() {
  const config = runtimeEnv();
  return Response.json({
    deepseek_configured: Boolean(config.DEEPSEEK_API_KEY),
    model: config.DEEPSEEK_MODEL || "deepseek-v4-pro",
    taxonomy_version: TAXONOMY_VERSION,
    database_configured: Boolean(config.DB)
  });
}

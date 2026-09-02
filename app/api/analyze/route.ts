import { analyzeRows, DeepSeekConfigurationError } from "@/lib/deepseek";
import { runtimeEnv } from "@/lib/runtime";
import { analyzeRequestSchema } from "@/lib/schemas";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const parsed = analyzeRequestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "提交的数据不符合分析契约", details: parsed.error.flatten() }, { status: 400 });
    const config = runtimeEnv();
    const personalKey = request.headers.get("x-deepseek-api-key")?.trim();
    if (personalKey && personalKey.length > 500) return Response.json({ error: "个人 API Key 长度无效" }, { status: 400 });
    const drafts = await analyzeRows(parsed.data.rows, {
      apiKey: personalKey || config.DEEPSEEK_API_KEY,
      model: config.DEEPSEEK_MODEL,
      baseUrl: config.DEEPSEEK_BASE_URL
    });
    return Response.json({ drafts });
  } catch (error) {
    if (error instanceof DeepSeekConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return Response.json({ error: "分析服务暂时不可用，请稍后重试" }, { status: 500 });
  }
}

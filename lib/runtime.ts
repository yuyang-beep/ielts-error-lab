import { env } from "cloudflare:workers";

export interface RuntimeEnv {
  DB?: D1Database;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  DEEPSEEK_BASE_URL?: string;
}

export function runtimeEnv(): RuntimeEnv {
  return env as unknown as RuntimeEnv;
}

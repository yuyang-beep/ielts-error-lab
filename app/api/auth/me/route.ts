import { env } from "cloudflare:workers";

export const runtime = "edge";

export async function GET(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email") || "";
  const fullName = request.headers.get("oai-authenticated-user-full-name") || "";
  return Response.json({
    authenticated: Boolean(email),
    email: email || null,
    name: fullName || email || null,
    sites_auth_available: typeof env === "object"
  });
}

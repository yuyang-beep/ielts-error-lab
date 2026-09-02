export function requireAuthenticatedSiteUser(request: Request): Response | null {
  const email = request.headers.get("oai-authenticated-user-email")?.trim();
  if (email) return null;
  return Response.json({ error: "请先登录 ChatGPT" }, { status: 401 });
}

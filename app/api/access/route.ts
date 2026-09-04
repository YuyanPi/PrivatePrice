import { env } from "cloudflare:workers";
export async function POST(request: Request) {
  const { code } = await request.json() as { code?: string };
  if (!code || code !== env.ACCESS_CODE) return Response.json({ error: "访问口令不正确" }, { status: 401 });
  return new Response(null,{status:204,headers:{"Set-Cookie":`price_access=${encodeURIComponent(code)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`}});
}
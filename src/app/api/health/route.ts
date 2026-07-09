export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, service: "therushabh.in", time: Date.now() });
}

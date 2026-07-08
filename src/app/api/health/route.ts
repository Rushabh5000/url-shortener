export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, service: "rushabh.in", time: Date.now() });
}

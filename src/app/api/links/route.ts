import { z } from "zod";
import { createLink, listLinks } from "@/lib/links";
import { authenticateRequest } from "@/lib/apiauth";
import { rateLimit } from "@/lib/ratelimit";
import { assertSameOrigin, clientIp, errorResponse } from "@/lib/http";
import { writeAudit } from "@/lib/audit";
import { shortUrl } from "@/lib/config";

export const runtime = "nodejs";

const CreateBody = z.object({
  url: z.string().min(1).optional(),
  destinationUrl: z.string().min(1).optional(),
  alias: z.string().max(64).optional().nullable(),
  title: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
});

/** POST /api/links — create a short link (session cookie or API key). */
export async function POST(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.kind === "session") assertSameOrigin(req);

    if (!rateLimit(`create:${auth.actor}:${clientIp(req)}`, 60, 60_000)) {
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const destination = parsed.data.destinationUrl ?? parsed.data.url;
    if (!destination) {
      return Response.json({ error: "A destination url is required" }, { status: 400 });
    }

    const { link, reused } = await createLink({
      destinationUrl: destination,
      alias: parsed.data.alias ?? undefined,
      title: parsed.data.title ?? undefined,
      notes: parsed.data.notes ?? undefined,
      tags: parsed.data.tags ?? undefined,
      createdBy: auth.actor,
    });

    if (!reused) {
      await writeAudit({ actor: auth.actor, action: "link.create", target: link.slug });
    }

    return Response.json(
      {
        id: link.id,
        slug: link.slug,
        shortUrl: shortUrl(link.slug),
        destinationUrl: link.destinationUrl,
        reused,
      },
      { status: reused ? 200 : 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

/** GET /api/links?q=... — list/search links (session cookie or API key). */
export async function GET(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

    const rows = await listLinks({ q, limit });
    return Response.json({
      links: rows.map((l) => ({ ...l, shortUrl: shortUrl(l.slug) })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

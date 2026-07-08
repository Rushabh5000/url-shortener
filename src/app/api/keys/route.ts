import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { getSession } from "@/lib/session";
import { createApiKey } from "@/lib/apikey";
import { assertSameOrigin, errorResponse } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

/** GET /api/keys — list keys (never returns raw key values). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const rows = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
    return Response.json({
      keys: rows.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        disabled: k.disabled,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

const Body = z.object({ name: z.string().min(1).max(60) });

/** POST /api/keys — create a key; returns the raw value exactly once. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "A name is required" }, { status: 400 });

    const { raw, key } = await createApiKey(parsed.data.name);
    await writeAudit({ actor: session.email, action: "apikey.create", target: key.name });
    return Response.json({ id: key.id, name: key.name, key: raw }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

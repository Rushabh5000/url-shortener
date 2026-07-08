import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { getSession } from "@/lib/session";
import { assertSameOrigin, errorResponse } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

/** DELETE /api/keys/:id — revoke an API key. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
    if (!rows[0]) return Response.json({ error: "Key not found" }, { status: 404 });

    await db.delete(apiKeys).where(eq(apiKeys.id, id));
    await writeAudit({ actor: session.email, action: "apikey.delete", target: rows[0].name });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

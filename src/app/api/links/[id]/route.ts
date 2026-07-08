import { z } from "zod";
import { deleteLink, getLinkById, updateLink } from "@/lib/links";
import { authenticateRequest } from "@/lib/apiauth";
import { assertSameOrigin, errorResponse } from "@/lib/http";
import { writeAudit } from "@/lib/audit";
import { shortUrl } from "@/lib/config";

export const runtime = "nodejs";

const PatchBody = z.object({
  destinationUrl: z.string().min(1).optional(),
  alias: z.string().max(64).optional(),
  title: z.string().max(300).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  tags: z.string().max(500).nullable().optional(),
  disabled: z.boolean().optional(),
});

/** PATCH /api/links/:id — edit / disable a link. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.kind === "session") assertSameOrigin(req);

    const { id } = await ctx.params;
    const existing = await getLinkById(id);
    if (!existing) return Response.json({ error: "Link not found" }, { status: 404 });

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid request body" }, { status: 400 });

    const link = await updateLink(id, parsed.data);
    await writeAudit({
      actor: auth.actor,
      action: "link.update",
      target: link.slug,
      meta: parsed.data,
    });
    return Response.json({ ...link, shortUrl: shortUrl(link.slug) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/links/:id — permanently delete a link and its clicks. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.kind === "session") assertSameOrigin(req);

    const { id } = await ctx.params;
    const existing = await getLinkById(id);
    if (!existing) return Response.json({ error: "Link not found" }, { status: 404 });

    await deleteLink(id);
    await writeAudit({ actor: auth.actor, action: "link.delete", target: existing.slug });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

import QRCode from "qrcode";
import { getLinkById } from "@/lib/links";
import { getSession } from "@/lib/session";
import { errorResponse } from "@/lib/http";
import { shortUrl } from "@/lib/config";

export const runtime = "nodejs";

/** GET /api/links/:id/qr?format=png|svg — QR code for the short URL. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const link = await getLinkById(id);
    if (!link) return Response.json({ error: "Link not found" }, { status: 404 });

    const url = shortUrl(link.slug);
    const format = new URL(req.url).searchParams.get("format") ?? "png";

    if (format === "svg") {
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 320 });
      return new Response(svg, { headers: { "content-type": "image/svg+xml" } });
    }

    const png = await QRCode.toBuffer(url, { type: "png", margin: 1, width: 320 });
    return new Response(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        "content-disposition": `inline; filename="${link.slug}.png"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

import { after, type NextRequest } from "next/server";
import { getLinkBySlug } from "@/lib/links";
import { recordClick } from "@/lib/analytics";
import { isReserved } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlResponse(status: number, title: string, body: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
:root{color-scheme:light}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbf6f1;
color:#2b211b;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.card{max-width:26rem;padding:2.5rem;text-align:center}
h1{font-size:3rem;margin:0 0 .5rem;color:#d8592f}
p{color:#7a6b5d;margin:0 0 1.5rem}
a{color:#d8592f;text-decoration:none;font-weight:600}
</style></head><body><div class="card"><h1>${title}</h1><p>${body}</p>
<a href="/">Go to rushabh.in →</a></div></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  // Ignore asset-looking requests (contain a dot) and reserved words.
  if (!slug || slug.includes(".") || isReserved(slug)) {
    return htmlResponse(404, "404", "This short link doesn’t exist.");
  }

  const link = await getLinkBySlug(slug);

  if (!link) {
    return htmlResponse(404, "404", "This short link doesn’t exist.");
  }
  if (link.disabled) {
    return htmlResponse(410, "Gone", "This short link has been disabled.");
  }

  // Log the click AFTER the response is flushed so redirects stay instant.
  after(async () => {
    try {
      await recordClick(req, link);
    } catch (err) {
      console.error("click logging failed", err);
    }
  });

  return Response.redirect(link.destinationUrl, 302);
}

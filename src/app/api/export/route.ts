import { desc } from "drizzle-orm";
import { db } from "@/db";
import { links, clicks } from "@/db/schema";
import { getSession } from "@/lib/session";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\n");
}

/** GET /api/export?type=links|clicks — download a CSV. */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const type = new URL(req.url).searchParams.get("type") ?? "links";

    let csv: string;
    let filename: string;

    if (type === "clicks") {
      const rows = await db.select().from(clicks).orderBy(desc(clicks.ts)).limit(50_000);
      csv = toCsv(
        ["slug", "timestamp", "referrer", "ua_summary", "country", "ip_hash"],
        rows.map((c) => [c.slug, c.ts, c.referrer, c.uaSummary, c.country, c.ipHash]),
      );
      filename = "clicks.csv";
    } else {
      const rows = await db.select().from(links).orderBy(desc(links.createdAt));
      csv = toCsv(
        ["slug", "destination_url", "title", "tags", "notes", "click_count", "disabled", "created_at", "last_clicked_at"],
        rows.map((l) => [
          l.slug, l.destinationUrl, l.title, l.tags, l.notes,
          l.clickCount, l.disabled, l.createdAt, l.lastClickedAt,
        ]),
      );
      filename = "links.csv";
    }

    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

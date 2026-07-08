import { randomUUID, createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { clicks, links, type Link } from "../db/schema";
import { config } from "./config";
import { clientIp } from "./http";

/** Salted, truncated hash of an IP — enough to approximate uniques, never reversible. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip + config.ipHashSalt).digest("hex").slice(0, 16);
}

/** Collapse a raw User-Agent into a compact "Browser · OS · device" summary. */
export function summarizeUa(ua: string): string {
  if (!ua) return "unknown";
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Other";
  const os =
    /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iOS/.test(ua) ? "iOS"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "Other";
  const device = /Mobi|Android|iPhone/.test(ua) ? "mobile" : "desktop";
  return `${browser} · ${os} · ${device}`;
}

/**
 * Record a click and bump the link's denormalised counters. Meant to be called
 * AFTER the redirect response is sent (via next/server `after`), so it never
 * adds latency to the redirect itself.
 */
export async function recordClick(req: Request, link: Pick<Link, "id" | "slug">): Promise<void> {
  const referrer = req.headers.get("referer");
  const ua = req.headers.get("user-agent") ?? "";
  const country = req.headers.get("x-vercel-ip-country");
  const now = new Date();

  await db.insert(clicks).values({
    id: randomUUID(),
    linkId: link.id,
    slug: link.slug,
    ts: now,
    referrer: referrer ? referrer.slice(0, 512) : null,
    uaSummary: summarizeUa(ua),
    ipHash: hashIp(clientIp(req)),
    country: country || null,
  });

  await db
    .update(links)
    .set({ clickCount: sql`${links.clickCount} + 1`, lastClickedAt: now })
    .where(eq(links.id, link.id));
}

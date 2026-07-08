import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { links, clicks, type Link, type Click } from "../db/schema";

export interface DashboardStats {
  totalLinks: number;
  totalClicks: number;
  clicksToday: number;
  topLinks: Array<Pick<Link, "id" | "slug" | "destinationUrl" | "clickCount">>;
  recentClicks: Click[];
  daily: Array<{ day: string; count: number }>;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [linkCount] = await db.select({ n: sql<number>`count(*)::int` }).from(links);
  const [clickCount] = await db.select({ n: sql<number>`count(*)::int` }).from(clicks);
  const [today] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(clicks)
    .where(gte(clicks.ts, startOfToday()));

  const topLinks = await db
    .select({
      id: links.id,
      slug: links.slug,
      destinationUrl: links.destinationUrl,
      clickCount: links.clickCount,
    })
    .from(links)
    .orderBy(desc(links.clickCount))
    .limit(5);

  const recentClicks = await db.select().from(clicks).orderBy(desc(clicks.ts)).limit(10);

  // Clicks per day for the last 14 days (UTC day buckets).
  const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);
  const dailyRows = await db
    .select({
      day: sql<string>`to_char(${clicks.ts}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(gte(clicks.ts, since))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return {
    totalLinks: linkCount?.n ?? 0,
    totalClicks: clickCount?.n ?? 0,
    clicksToday: today?.n ?? 0,
    topLinks,
    recentClicks,
    daily: dailyRows,
  };
}

export async function getRecentClicksForLink(linkId: string, limit = 20): Promise<Click[]> {
  return db
    .select()
    .from(clicks)
    .where(eq(clicks.linkId, linkId))
    .orderBy(desc(clicks.ts))
    .limit(limit);
}

export async function getTopReferrersForLink(linkId: string, limit = 5) {
  return db
    .select({ referrer: clicks.referrer, count: sql<number>`count(*)::int` })
    .from(clicks)
    .where(and(eq(clicks.linkId, linkId), sql`${clicks.referrer} is not null`))
    .groupBy(clicks.referrer)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

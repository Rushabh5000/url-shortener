import { randomUUID } from "node:crypto";
import { desc } from "drizzle-orm";
import { db } from "../db";
import { auditLog } from "../db/schema";

export interface AuditInput {
  actor: string; // email, "apikey:<name>", or "telegram:<chatId>"
  action: string; // e.g. "link.create", "link.delete", "auth.login"
  target?: string | null; // slug or id
  meta?: Record<string, unknown>;
}

/** Record an admin action. Never throws — auditing must not break the request. */
export async function writeAudit(entry: AuditInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: randomUUID(),
      ts: new Date(),
      actor: entry.actor,
      action: entry.action,
      target: entry.target ?? null,
      meta: entry.meta ? JSON.stringify(entry.meta) : null,
    });
  } catch (err) {
    console.error("audit write failed", err);
  }
}

export async function recentAudit(limit = 50) {
  return db.select().from(auditLog).orderBy(desc(auditLog.ts)).limit(limit);
}

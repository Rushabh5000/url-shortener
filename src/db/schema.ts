import { pgTable, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Single-admin users table. For a personal shortener this normally holds one row.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

/**
 * The short links themselves. `clickCount` / `lastClickedAt` are denormalised
 * counters bumped on redirect so the dashboard stays fast without scanning clicks.
 */
export const links = pgTable(
  "links",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    destinationUrl: text("destination_url").notNull(),
    title: text("title"),
    notes: text("notes"),
    tags: text("tags"), // comma-separated, normalised lowercase
    disabled: boolean("disabled").notNull().default(false),
    clickCount: integer("click_count").notNull().default(0),
    lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    createdBy: text("created_by"),
  },
  (t) => [
    index("links_destination_idx").on(t.destinationUrl),
    index("links_created_idx").on(t.createdAt),
  ],
);

/**
 * One row per redirect. Kept intentionally lightweight and privacy-aware:
 * no raw IPs (only a salted hash), user agent summarised to browser/os/device.
 */
export const clicks = pgTable(
  "clicks",
  {
    id: text("id").primaryKey(),
    linkId: text("link_id").notNull(),
    slug: text("slug").notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    referrer: text("referrer"),
    uaSummary: text("ua_summary"),
    ipHash: text("ip_hash"),
    country: text("country"),
  },
  (t) => [
    index("clicks_link_idx").on(t.linkId),
    index("clicks_ts_idx").on(t.ts),
  ],
);

/**
 * API keys for automation (iOS Shortcuts, scripts, etc.). Only the SHA-256 hash
 * is stored; the raw key is shown exactly once at creation time.
 */
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  disabled: boolean("disabled").notNull().default(false),
});

/**
 * Audit trail for admin actions (create/edit/delete/login/import).
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    meta: text("meta"), // JSON string
  },
  (t) => [index("audit_ts_idx").on(t.ts)],
);

export type User = typeof users.$inferSelect;
export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type Click = typeof clicks.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;

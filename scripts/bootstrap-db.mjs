// Idempotent database initialiser. Creates all tables/indexes if missing.
// Targets Neon/Vercel Postgres via DATABASE_URL.
//
//   node scripts/bootstrap-db.mjs
//
// (Prefer this over drizzle-kit push for a zero-surprise, non-interactive setup.)

try {
  await import("dotenv/config"); // load .env when present (local/dev)
} catch {
  // dotenv not installed / no .env — rely on the ambient environment
}

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = neon(url);

// Neon's HTTP driver runs one statement per call, so DDL is a plain array.
const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    destination_url TEXT NOT NULL,
    title TEXT,
    notes TEXT,
    tags TEXT,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    click_count INTEGER NOT NULL DEFAULT 0,
    last_clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    created_by TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS links_destination_idx ON links (destination_url)`,
  `CREATE INDEX IF NOT EXISTS links_created_idx ON links (created_at)`,
  `CREATE TABLE IF NOT EXISTS clicks (
    id TEXT PRIMARY KEY,
    link_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    referrer TEXT,
    ua_summary TEXT,
    ip_hash TEXT,
    country TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS clicks_link_idx ON clicks (link_id)`,
  `CREATE INDEX IF NOT EXISTS clicks_ts_idx ON clicks (ts)`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    disabled BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    meta TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS audit_ts_idx ON audit_log (ts)`,
];

for (const statement of statements) {
  await sql(statement);
}

console.log("Database ready (Postgres).");
process.exit(0);

/**
 * Import legacy short links from CSV or JSON.
 *
 *   npm run import -- --file old-links.csv            # auto-detects format
 *   npm run import -- --file old-links.json --dry-run # preview only
 *
 * Recognised columns / keys (case-insensitive, first match wins):
 *   slug     : slug | keyword | short | short_code | code
 *   url      : destination_url | url | long_url | destination | target
 *   title    : title
 *   notes    : notes | description
 *   tags     : tags
 *   created  : created_at | created | date
 *
 * Behaviour: invalid URLs are skipped, existing slugs are skipped (duplicates),
 * provided slugs are preserved when valid, otherwise a slug is generated.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index";
import { links } from "../src/db/schema";
import { normalizeAndValidateUrl } from "../src/lib/url";
import { generateSlug, isReserved, normalizeAlias } from "../src/lib/slug";

// ── args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const file = arg("file");
const dryRun = args.includes("--dry-run");
let format = arg("format");

if (!file) {
  console.error("Usage: npm run import -- --file <path> [--format csv|json] [--dry-run]");
  process.exit(1);
}
if (!format) format = file.toLowerCase().endsWith(".json") ? "json" : "csv";

// ── parsing ───────────────────────────────────────────────────
function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

function pick(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function parseDate(v: string | undefined): Date {
  if (!v) return new Date();
  const num = Number(v);
  if (Number.isFinite(num) && num > 0) return new Date(num < 1e12 ? num * 1000 : num);
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ── run ───────────────────────────────────────────────────────
const raw = readFileSync(file, "utf8");
const records: Array<Record<string, unknown>> =
  format === "json" ? JSON.parse(raw) : parseCsv(raw);

if (!Array.isArray(records)) {
  console.error("JSON file must contain an array of objects.");
  process.exit(1);
}

const stats = { total: records.length, imported: 0, skippedDup: 0, skippedInvalid: 0, generated: 0 };
console.log(`Importing ${records.length} records from ${file} (${format})${dryRun ? " [DRY RUN]" : ""}\n`);

for (const rec of records) {
  const rawUrl = pick(rec, ["destination_url", "url", "long_url", "destination", "target"]);
  let destinationUrl: string;
  try {
    destinationUrl = normalizeAndValidateUrl(rawUrl ?? "");
  } catch {
    stats.skippedInvalid++;
    console.log(`  ✗ invalid url: ${rawUrl ?? "(empty)"}`);
    continue;
  }

  let slug = pick(rec, ["slug", "keyword", "short", "short_code", "code"]);
  if (slug) {
    slug = normalizeAlias(slug);
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug) || isReserved(slug)) {
      console.log(`  ! slug "${slug}" invalid/reserved — generating a new one`);
      slug = undefined;
    }
  }

  if (slug) {
    const existing = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
    if (existing[0]) {
      stats.skippedDup++;
      console.log(`  = skip duplicate slug: /${slug}`);
      continue;
    }
  } else {
    // generate a unique slug
    for (let i = 0; i < 10 && !slug; i++) {
      const candidate = generateSlug();
      if (isReserved(candidate)) continue;
      const existing = await db.select().from(links).where(eq(links.slug, candidate)).limit(1);
      if (!existing[0]) slug = candidate;
    }
    stats.generated++;
  }
  if (!slug) { stats.skippedInvalid++; continue; }

  const createdAt = parseDate(pick(rec, ["created_at", "created", "date"]));
  const row = {
    id: randomUUID(),
    slug,
    destinationUrl,
    title: pick(rec, ["title"]) ?? null,
    notes: pick(rec, ["notes", "description"]) ?? null,
    tags: pick(rec, ["tags"]) ?? null,
    disabled: false,
    clickCount: 0,
    lastClickedAt: null,
    createdAt,
    updatedAt: new Date(),
    createdBy: "import",
  };

  if (!dryRun) await db.insert(links).values(row);
  stats.imported++;
  console.log(`  ✓ /${slug} -> ${destinationUrl}`);
}

console.log("\n─ Summary ─────────────────────────────");
console.log(`  total records   : ${stats.total}`);
console.log(`  imported        : ${stats.imported}${dryRun ? " (dry run, nothing written)" : ""}`);
console.log(`  slugs generated : ${stats.generated}`);
console.log(`  skipped (dup)   : ${stats.skippedDup}`);
console.log(`  skipped (bad)   : ${stats.skippedInvalid}`);
process.exit(0);

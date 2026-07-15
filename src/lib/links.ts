import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "../db";
import { links, clicks, type Link } from "../db/schema";
import { config } from "./config";
import { ConflictError } from "./errors";
import { normalizeAndValidateUrl } from "./url";
import { assertValidAlias, generateSlug, isReserved } from "./slug";
import { smartSlugCandidate } from "./smart-slug";
import { applyAffiliateParams } from "./affiliate";

const MAX_SLUG_ATTEMPTS = 8;
const MAX_SMART_SLUG_COLLISION_RETRIES = 3;

export interface CreateLinkInput {
  destinationUrl: string;
  alias?: string | null;
  title?: string | null;
  notes?: string | null;
  tags?: string | null;
  createdBy?: string | null;
  /** Set false to skip content-aware slugs and go straight to a random one (default true). */
  useSmartSlug?: boolean;
}

export interface CreateLinkResult {
  link: Link;
  reused: boolean;
  /** True if the destination was routed through the affiliate converter (i.e. not Amazon, not reused). */
  affiliateAttempted: boolean;
  /** True only if the affiliate converter actually returned a usable link. */
  affiliateConverted: boolean;
}

function normalizeTags(tags?: string | null): string | null {
  if (!tags) return null;
  const cleaned = tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return cleaned.length ? Array.from(new Set(cleaned)).join(",") : null;
}

export async function getLinkBySlug(slug: string): Promise<Link | undefined> {
  const rows = await db.select().from(links).where(eq(links.slug, slug.toLowerCase())).limit(1);
  return rows[0];
}

export async function getLinkById(id: string): Promise<Link | undefined> {
  const rows = await db.select().from(links).where(eq(links.id, id)).limit(1);
  return rows[0];
}

async function generateUniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    // Grow the length slightly after a few collisions to keep success likely.
    const length = config.slugLength + Math.floor(attempt / 3);
    const candidate = generateSlug(length);
    if (isReserved(candidate)) continue;
    const existing = await getLinkBySlug(candidate);
    if (!existing) return candidate;
  }
  throw new ConflictError("Could not generate a unique slug, please try again");
}

/** Try a content-aware base slug, retrying with a short random suffix on collision. */
async function resolveSmartSlug(destinationUrl: string): Promise<string | null> {
  const base = await smartSlugCandidate(destinationUrl);
  if (!base || isReserved(base)) return null;

  if (!(await getLinkBySlug(base))) return base;

  for (let i = 0; i < MAX_SMART_SLUG_COLLISION_RETRIES; i++) {
    const candidate = `${base}-${generateSlug(3)}`;
    if (!(await getLinkBySlug(candidate))) return candidate;
  }
  return null; // fall back to a fully random slug
}

/**
 * Create a short link. Validates the URL, resolves the slug (custom alias or
 * generated), enforces collision + reserved-word rules, and honours REUSE_EXISTING.
 */
export async function createLink(input: CreateLinkInput): Promise<CreateLinkResult> {
  const originalUrl = normalizeAndValidateUrl(input.destinationUrl);
  const title = input.title?.trim() || null;
  const notes = input.notes?.trim() || null;
  const tags = normalizeTags(input.tags);

  // Smart-slug keyword extraction runs against the *original* URL (a
  // converted affiliate tracking link is an opaque redirect, useless for
  // keywords) — run it alongside the affiliate conversion so the two
  // network calls overlap instead of stacking.
  const wantsSmartSlug = !input.alias && input.useSmartSlug !== false;
  const [affiliate, smart] = await Promise.all([
    applyAffiliateParams(originalUrl),
    wantsSmartSlug ? resolveSmartSlug(originalUrl) : Promise.resolve(null),
  ]);
  const destinationUrl = affiliate.url;

  let slug: string;

  if (input.alias) {
    slug = assertValidAlias(input.alias);
    if (await getLinkBySlug(slug)) {
      throw new ConflictError(`The alias "${slug}" is already taken`);
    }
  } else {
    if (config.reuseExisting) {
      const existing = await db
        .select()
        .from(links)
        .where(eq(links.destinationUrl, destinationUrl))
        .limit(1);
      if (existing[0]) {
        return {
          link: existing[0],
          reused: true,
          affiliateAttempted: affiliate.attempted,
          affiliateConverted: affiliate.converted,
        };
      }
    }
    slug = smart ?? (await generateUniqueSlug());
  }

  const now = new Date();
  const link: Link = {
    id: randomUUID(),
    slug,
    destinationUrl,
    title,
    notes,
    tags,
    disabled: false,
    clickCount: 0,
    lastClickedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy ?? null,
  };
  await db.insert(links).values(link);
  return {
    link,
    reused: false,
    affiliateAttempted: affiliate.attempted,
    affiliateConverted: affiliate.converted,
  };
}

export interface UpdateLinkInput {
  destinationUrl?: string;
  alias?: string;
  title?: string | null;
  notes?: string | null;
  tags?: string | null;
  disabled?: boolean;
}

/** Patch an existing link. Only provided fields are changed. */
export async function updateLink(id: string, patch: UpdateLinkInput): Promise<Link> {
  const current = await getLinkById(id);
  if (!current) throw new ConflictError("Link not found");

  const changes: Partial<Link> = { updatedAt: new Date() };

  if (patch.destinationUrl !== undefined) {
    const affiliate = await applyAffiliateParams(normalizeAndValidateUrl(patch.destinationUrl));
    changes.destinationUrl = affiliate.url;
  }
  if (patch.alias !== undefined && patch.alias !== current.slug) {
    const slug = assertValidAlias(patch.alias);
    const clash = await getLinkBySlug(slug);
    if (clash && clash.id !== id) throw new ConflictError(`The alias "${slug}" is already taken`);
    changes.slug = slug;
  }
  if (patch.title !== undefined) changes.title = patch.title?.trim() || null;
  if (patch.notes !== undefined) changes.notes = patch.notes?.trim() || null;
  if (patch.tags !== undefined) changes.tags = normalizeTags(patch.tags);
  if (patch.disabled !== undefined) changes.disabled = patch.disabled;

  await db.update(links).set(changes).where(eq(links.id, id));
  return (await getLinkById(id))!;
}

export async function deleteLink(id: string): Promise<void> {
  await db.delete(clicks).where(eq(clicks.linkId, id));
  await db.delete(links).where(eq(links.id, id));
}

export const SORT_COLUMNS = {
  slug: links.slug,
  destination: links.destinationUrl,
  clicks: links.clickCount,
  created: links.createdAt,
  lastClick: links.lastClickedAt,
} as const;

export type SortColumn = keyof typeof SORT_COLUMNS;
export type SortDir = "asc" | "desc";
export type SortKey = `${SortColumn}-${SortDir}`;

export const SORT_OPTIONS: Record<SortKey, ReturnType<typeof asc>> = Object.fromEntries(
  (Object.keys(SORT_COLUMNS) as SortColumn[]).flatMap((col) => [
    [`${col}-asc`, asc(SORT_COLUMNS[col])],
    [`${col}-desc`, desc(SORT_COLUMNS[col])],
  ]),
) as Record<SortKey, ReturnType<typeof asc>>;

export interface ListLinksOptions {
  q?: string;
  sort?: SortKey;
  limit?: number;
  offset?: number;
}

export async function listLinks(opts: ListLinksOptions = {}): Promise<Link[]> {
  const { q, sort = "created-desc", limit = 100, offset = 0 } = opts;
  const where = q
    ? or(
        like(links.slug, `%${q}%`),
        like(links.destinationUrl, `%${q}%`),
        like(links.title, `%${q}%`),
        like(links.tags, `%${q}%`),
      )
    : undefined;
  return db
    .select()
    .from(links)
    .where(where)
    .orderBy(SORT_OPTIONS[sort] ?? SORT_OPTIONS["created-desc"])
    .limit(limit)
    .offset(offset);
}

/** True for links created through the unauthenticated /create flow — surfaced in the admin UI for moderation. */
export function isPublicSubmission(createdBy: string | null): boolean {
  return !!createdBy && createdBy.startsWith("public:");
}

export { and, eq, sql };

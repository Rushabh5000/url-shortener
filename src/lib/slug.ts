import { randomBytes } from "node:crypto";
import { ValidationError } from "./errors";
import { config } from "./config";

// URL-safe alphabet with visually-ambiguous characters removed (no 0/o/1/l/i).
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

// Paths the app owns — these can never be used as slugs. The app runs on the
// root domain (rushabh.in) alongside a real homepage, so this also reserves
// the personal-site sections likely to exist as real pages. Add to this list
// whenever a new top-level page is added to the site.
export const RESERVED = new Set<string>([
  "api",
  "login",
  "logout",
  "dashboard",
  "quick",
  "settings",
  "admin",
  "links",
  "new",
  "health",
  "qr",
  "export",
  "import",
  "static",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "icon",
  "apple-icon",
  // personal-site sections (root-domain hosting)
  "about",
  "projects",
  "resume",
  "cv",
  "blog",
  "contact",
  "work",
  "portfolio",
  "uses",
]);

export function isReserved(slug: string): boolean {
  return RESERVED.has(slug.toLowerCase());
}

/** Generate a random URL-safe slug. */
export function generateSlug(length: number = config.slugLength): string {
  const len = Math.max(3, length);
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Lowercase + trim a user-supplied custom alias. */
export function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

/**
 * Validate a custom alias. Allowed: a-z 0-9 - _ , length 1–64, not reserved.
 * Returns the normalised alias or throws ValidationError.
 */
export function assertValidAlias(alias: string): string {
  const a = normalizeAlias(alias);
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(a)) {
    throw new ValidationError(
      "Alias may use letters, numbers, - and _ (max 64 chars) and must start with a letter or number",
    );
  }
  if (isReserved(a)) {
    throw new ValidationError(`"${a}" is a reserved word and can't be used as an alias`);
  }
  return a;
}

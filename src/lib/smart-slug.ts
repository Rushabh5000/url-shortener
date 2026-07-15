import { fetchPageTitle } from "./safe-fetch-meta";
import { fetchJsRenderedTitle } from "./js-rendered-title";

// A slug this permits must ALSO satisfy this (same pattern as custom
// aliases, see slug.ts) — the final safety net in toSlug() below. Whatever
// upstream word-splitting misses (unusual punctuation, malformed/double-
// encoded URLs, etc.), this guarantees a generated slug can never contain a
// character the redirect route would reject (it 404s any slug containing a
// dot, to filter out asset-like requests such as favicon.ico).
const VALID_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

const STOPWORDS = new Set([
  "www", "http", "https", "com", "html", "htm", "php", "index", "home",
  "the", "and", "for", "with", "from", "this", "that", "into", "your",
  "page", "pages", "view", "detail", "details", "product", "products",
  "item", "items", "shop", "store", "buy", "online", "official", "site",
  "id", "dp", "gp", "itm", "pid", "ref", "utm", "src", "amp",
]);

function isMeaningfulWord(word: string): boolean {
  if (word.length < 3 || word.length > 24) return false;
  if (STOPWORDS.has(word)) return false;
  if (/^\d+$/.test(word)) return false; // purely numeric
  const digitCount = (word.match(/\d/g) ?? []).length;
  if (digitCount / word.length > 0.3) return false; // mostly digits -> probably an ID
  if (word.length > 5 && !/[aeiou]/i.test(word)) return false; // no vowels -> probably an ID
  return true;
}

function toSlug(words: string[], maxWords = 4, maxLen = 40): string | null {
  // Strip anything that isn't a letter/digit from each word first — handles
  // stray punctuation from malformed URLs (e.g. a literal "dlhttp:" segment
  // or an embedded, un-encoded second URL) before the word ever reaches the
  // length/stopword checks below.
  const kept = Array.from(
    new Set(
      words
        .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
        .filter(isMeaningfulWord),
    ),
  ).slice(0, maxWords);
  if (kept.length === 0) return null;

  let slug = kept.join("-");
  if (slug.length > maxLen) slug = slug.slice(0, maxLen).replace(/-[^-]*$/, "");

  return VALID_SLUG.test(slug) ? slug : null;
}

/** Tier 1: pull keywords straight out of the destination URL's own path. */
function keywordsFromUrl(destinationUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(destinationUrl);
  } catch {
    return null;
  }
  const words = url.pathname
    .split(/[/_.:-]+/)
    .flatMap((segment) => segment.split(/(?=[A-Z])/)) // camelCase -> separate words
    .filter(Boolean);
  return toSlug(words);
}

/**
 * Tier 2 + 3, run concurrently so the added latency is bounded by the
 * slower of the two (~3s), not their sum:
 *   - Tier 2: SSRF-safe, no-JS page fetch (fast, but blind to client-side
 *     redirects — some short-link/cashback services only reach their real
 *     destination via `window.location`, not an HTTP redirect).
 *   - Tier 3: hosted headless-render (Microlink) that does execute JS, so
 *     it sees through those client-side redirects. Preferred when it
 *     returns something, since it reflects the actual destination.
 */
async function keywordsFromTitle(destinationUrl: string): Promise<string | null> {
  const [htmlResult, renderedResult] = await Promise.allSettled([
    fetchPageTitle(destinationUrl),
    fetchJsRenderedTitle(destinationUrl),
  ]);

  const rendered = renderedResult.status === "fulfilled" ? renderedResult.value : null;
  const html = htmlResult.status === "fulfilled" ? htmlResult.value : null;
  const title = rendered || html;
  if (!title) return null;

  const words = title.split(/[\s/_-]+/).filter(Boolean);
  return toSlug(words);
}

/**
 * Best-effort content-aware slug candidate for a destination URL. Returns
 * null if nothing usable was found — callers must fall back to a random
 * slug in that case. Never throws.
 */
export async function smartSlugCandidate(destinationUrl: string): Promise<string | null> {
  try {
    const fromUrl = keywordsFromUrl(destinationUrl);
    if (fromUrl) return fromUrl;
    return await keywordsFromTitle(destinationUrl);
  } catch {
    return null;
  }
}

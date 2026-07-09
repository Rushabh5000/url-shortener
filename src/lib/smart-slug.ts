import { fetchPageTitle } from "./safe-fetch-meta";

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
  const kept = words
    .map((w) => w.toLowerCase())
    .filter(isMeaningfulWord)
    .slice(0, maxWords);
  if (kept.length === 0) return null;

  let slug = kept.join("-");
  if (slug.length > maxLen) slug = slug.slice(0, maxLen).replace(/-[^-]*$/, "");
  return slug || null;
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
    .split(/[/_-]+/)
    .flatMap((segment) => segment.split(/(?=[A-Z])/)) // camelCase -> separate words
    .filter(Boolean);
  return toSlug(words);
}

/** Tier 2: fetch the page title (SSRF-safe, bounded) and extract keywords from that instead. */
async function keywordsFromTitle(destinationUrl: string): Promise<string | null> {
  const title = await fetchPageTitle(destinationUrl);
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

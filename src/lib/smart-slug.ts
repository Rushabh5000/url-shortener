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
  // Storefront title boilerplate that never says what the page is about.
  "prime", "eligible", "today", "todays", "best", "price", "prices", "india", "free", "shipping",
  // Generic marketing/deal filler that's technically a "word" but tells you
  // nothing about what the link actually is — better to fall through to the
  // title-fetch tiers than settle for a slug like "deals-mumbai-btl".
  "deal", "deals", "offer", "offers", "sale", "sales", "coupon", "coupons",
  "cashback", "promo", "promos", "discount", "discounts", "voucher", "vouchers",
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

// Path segments that mark a generic marketing wrapper rather than a real
// product/article slug (deal-aggregator pages, cashback/coupon landers,
// etc). Their path never carries useful context — the destination's own
// keywords are marketing boilerplate, not the actual thing being linked to
// — so Tier 1 is skipped entirely and callers fall through to the
// title-fetch tiers, which see the rendered page content instead.
const GENERIC_PATH_SEGMENTS = /^(deals?|offers?|coupons?|promos?|cashback|discounts?)$/i;

/** Tier 1: pull keywords straight out of the destination URL's own path. */
function keywordsFromUrl(destinationUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(destinationUrl);
  } catch {
    return null;
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.some((s) => GENERIC_PATH_SEGMENTS.test(s))) return null;

  const words = segments
    .flatMap((segment) => segment.split(/[_.:-]+/))
    .flatMap((segment) => segment.split(/(?=[A-Z])/)) // camelCase -> separate words
    .filter(Boolean);
  return toSlug(words);
}

// Titles served to bots by interstitials, captcha walls and error pages —
// never describe the link, so they must not become a slug.
const JUNK_TITLE =
  /just a moment|access denied|robot check|attention required|captcha|redirecting|please wait|sign[ -]?in|log[ -]?in|not found|page not available|service unavailable|temporarily unavailable|bad gateway|internal server error|gateway timeout|too many requests|^\s*(400|403|404|429|500|502|503|504)\b/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// "₹10,000" / "Rs. 5000" -> "10k" / "5k". For deal and shopping links the
// price band is often the only thing that tells two otherwise-identical
// pages apart, but toSlug() deliberately drops digit-heavy words (they're
// usually IDs), so prices are pulled out here and appended separately.
// An optional "over/under/..." qualifier stays attached to its amount — "over
// 25k" and "25k" are different pages.
const PRICE = /(?:\b(over|under|above|below)\s+)?(?:₹|rs\.?|inr)\s*([\d,]+)/gi;

function priceTokens(title: string): string[] {
  const out: string[] = [];
  for (const m of title.matchAll(PRICE)) {
    const n = Number(m[2].replace(/,/g, ""));
    if (!n) continue;
    const amount = n >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : String(n);
    out.push(m[1] ? `${m[1].toLowerCase()}-${amount}` : amount);
  }
  return Array.from(new Set(out)).slice(0, 2);
}

/** Turn a page title into a slug: leading words for what it is, then any price band. */
function slugFromTitle(rawTitle: string): string | null {
  const title = decodeEntities(rawTitle);
  if (JUNK_TITLE.test(title)) return null;

  const prices = priceTokens(title);
  const text = title
    .replace(PRICE, " ")
    // "Amazon.in:" -> "Amazon" so the site name reads as a word, not "amazonin"
    .replace(/\b([a-z0-9-]+)\.(?:co\.in|com|in|net|org)\b/gi, "$1");
  const words = text.split(/[\s/_:|–—-]+/).filter(Boolean);

  const priceSuffix = prices.join("-");
  const room = priceSuffix ? 40 - priceSuffix.length - 1 : 40;
  const base = toSlug(words, prices.length ? 2 : 3, room);
  if (!base) return null;

  const slug = priceSuffix ? `${base}-${priceSuffix}` : base;
  return VALID_SLUG.test(slug) ? slug : null;
}

/**
 * What the page actually says it is. The plain SSRF-safe HTML fetch goes
 * first — it's fast, and follows HTTP redirects so third-party redirector
 * links resolve to the real destination's title. Only if that gives nothing
 * usable (client-side redirect, JS-rendered title, bot wall) do we pay for
 * the hosted headless render (Microlink), which executes JS.
 */
async function keywordsFromTitle(destinationUrl: string): Promise<string | null> {
  const html = await fetchPageTitle(destinationUrl).catch(() => null);
  const fromHtml = html ? slugFromTitle(html) : null;
  if (fromHtml) return fromHtml;

  const rendered = await fetchJsRenderedTitle(destinationUrl).catch(() => null);
  return rendered ? slugFromTitle(rendered) : null;
}

/**
 * Best-effort content-aware slug candidate for a destination URL: based on
 * what the page is about (its title), falling back to keywords in the URL
 * path only when the page gives nothing usable. Returns null if neither
 * works — callers must then use a random slug. Never throws.
 */
export async function smartSlugCandidate(destinationUrl: string): Promise<string | null> {
  try {
    const fromTitle = await keywordsFromTitle(destinationUrl);
    if (fromTitle) return fromTitle;
    return keywordsFromUrl(destinationUrl);
  } catch {
    return null;
  }
}

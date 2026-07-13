// Rewrites Amazon/Flipkart destination URLs to strip any existing affiliate
// tag and replace it with this account's own, so purchases made through
// shortened links are tracked correctly. Runs once, at the point a
// destination URL is set (create or edit) — every creation channel
// (dashboard, /create, Telegram, API, import) goes through createLink()/
// updateLink(), so this applies uniformly regardless of source.

const AMAZON_HOST = /(^|\.)amazon\.[a-z.]+$/i;
const AMAZON_SHORT_HOSTS = new Set(["amzn.to", "amzn.in", "amzn.eu", "amzn.asia"]);
const FLIPKART_HOST = /(^|\.)flipkart\.com$/i;

const AMAZON_TAG = "extra.discount-21";
const FLIPKART_PARAMS = {
  affid: "rohanpouri",
  affExtParam1: "ENKR20260514A1974183999",
  affExtParam2: "232047",
};

function isAmazon(hostname: string): boolean {
  return AMAZON_HOST.test(hostname) || AMAZON_SHORT_HOSTS.has(hostname);
}

function isFlipkart(hostname: string): boolean {
  return FLIPKART_HOST.test(hostname);
}

/**
 * If the URL is an Amazon or Flipkart link, strip any existing affiliate
 * params and append this account's own. Any other URL passes through
 * unchanged. Never throws — an unparseable URL is returned as-is (the
 * caller validates URLs separately).
 */
export function applyAffiliateParams(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const hostname = url.hostname.toLowerCase();

  if (isAmazon(hostname)) {
    url.searchParams.delete("tag");
    url.searchParams.set("tag", AMAZON_TAG);
  } else if (isFlipkart(hostname)) {
    url.searchParams.delete("affid");
    url.searchParams.delete("affExtParam1");
    url.searchParams.delete("affExtParam2");
    for (const [key, value] of Object.entries(FLIPKART_PARAMS)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

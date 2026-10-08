// Rewrites destination URLs so purchases made through shortened links are
// tracked to this account.
//
// Amazon is handled with a static, deterministic tag param (Amazon
// Associates' own mechanism). Every other domain is routed through
// EarnKaro's converter API, which covers most Indian retailers (Flipkart,
// Myntra, Ajio, Nykaa, ...) behind one endpoint -- this replaces what used
// to be Flipkart-specific static param rewriting.
//
// Runs once, at the point a destination URL is set (create or edit) --
// every creation channel (dashboard, /create, Telegram, API, import) goes
// through createLink()/updateLink(), so this applies uniformly.

import { convertToEarnKaroLink } from "./earnkaro";
import { findRedirectTarget } from "./safe-fetch-meta";

const AMAZON_HOST = /(^|\.)amazon\.[a-z.]+$/i;
const AMAZON_SHORT_HOSTS = new Set(["amzn.to", "amzn.in", "amzn.eu", "amzn.asia"]);
const AMAZON_TAG = "extra.discount-21";

function isAmazon(hostname: string): boolean {
  return AMAZON_HOST.test(hostname) || AMAZON_SHORT_HOSTS.has(hostname);
}

/** Strip any existing tag (e.g. another affiliate's) and set this account's own. */
function withAmazonTag(url: URL): string {
  url.searchParams.delete("tag");
  url.searchParams.set("tag", AMAZON_TAG);
  return url.toString();
}

export interface AffiliateResult {
  url: string;
  /** True if this domain was routed through EarnKaro (i.e. not Amazon). */
  attempted: boolean;
  /** True only if EarnKaro actually returned a usable affiliate link. */
  converted: boolean;
}

/**
 * Amazon: strip any existing tag and set this account's own — always
 * succeeds, no network call. Everything else: attempt EarnKaro conversion;
 * on failure (unsupported merchant, no token, network error) the original
 * URL passes through unchanged. Never throws.
 */
export async function applyAffiliateParams(rawUrl: string): Promise<AffiliateResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { url: rawUrl, attempted: false, converted: false };
  }

  if (isAmazon(url.hostname.toLowerCase())) {
    return { url: withAmazonTag(url), attempted: false, converted: false };
  }

  // The pasted URL may be someone else's redirector (e.g. a deals channel's
  // short links) that lands on Amazon — EarnKaro can't convert those, and
  // the hostname alone doesn't reveal it. Follow the redirects alongside the
  // EarnKaro call so the two overlap; Amazon wins if the chain reaches it.
  const [amazonTarget, converted] = await Promise.all([
    findRedirectTarget(rawUrl, isAmazon),
    convertToEarnKaroLink(rawUrl),
  ]);
  if (amazonTarget) {
    return { url: withAmazonTag(new URL(amazonTarget)), attempted: false, converted: false };
  }
  if (converted) {
    return { url: converted, attempted: true, converted: true };
  }
  return { url: rawUrl, attempted: true, converted: false };
}

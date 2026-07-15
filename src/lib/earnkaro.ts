// EarnKaro's converter API turns a plain retailer URL into an affiliate
// tracking link. It covers most Indian retailers (Flipkart, Myntra, Ajio,
// Nykaa, ...) through one endpoint, which is why it replaces the old
// Flipkart-specific static param rewriting entirely.
//
// Important, verified by hitting the real API directly: on an unsupported
// domain it still returns `success: 1`, but `data` is an *error message
// string* ("We could not locate an affiliate URL...") instead of a URL —
// checking `success` alone is not enough, `data` must be validated as an
// actual URL. Conversions are also non-deterministic (the same input URL
// gets a different tracking link each call).

const ENDPOINT = "https://ekaro-api.affiliaters.in/api/converter/public";
const TIMEOUT_MS = 5000;

function looksLikeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Convert a destination URL to an EarnKaro affiliate link. Returns null on
 * any failure (unsupported merchant, no token configured, network error,
 * timeout) — callers must fall back to the original URL in that case.
 * Never throws.
 */
export async function convertToEarnKaroLink(url: string): Promise<string | null> {
  const token = process.env.EARNKARO_API_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ deal: url, convert_option: "convert_only" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { success?: number; data?: unknown };
    if (json.success !== 1) return null;
    return looksLikeUrl(json.data) ? json.data : null;
  } catch {
    return null;
  }
}

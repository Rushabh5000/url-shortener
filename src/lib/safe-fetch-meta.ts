import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// The only place in the codebase allowed to make an outbound request to a
// user-supplied URL. Used to grab a page <title>/og:title for content-aware
// slugs. Hardened against SSRF: private/loopback/link-local IPs are blocked
// (checked on the *resolved* IP, not the hostname, to close DNS-rebinding),
// every redirect hop is re-validated the same way, and both time and response
// size are capped.

const FETCH_TIMEOUT_MS = 2000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 65536; // enough for <head>, never buffer a whole page

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 0) return true; // 0.0.0.0/8
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local fe80::/10
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — check the embedded v4 address too.
    return isBlockedIPv4(lower.slice(7));
  }
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const version = isIP(hostname);
  if (version === 4 && isBlockedIPv4(hostname)) throw new Error("blocked host");
  if (version === 6 && isBlockedIPv6(hostname)) throw new Error("blocked host");
  if (version) return; // public literal IP, fine

  const addresses = await lookup(hostname, { all: true });
  for (const { address, family } of addresses) {
    if (family === 4 && isBlockedIPv4(address)) throw new Error("blocked host");
    if (family === 6 && isBlockedIPv6(address)) throw new Error("blocked host");
  }
  if (addresses.length === 0) throw new Error("host does not resolve");
}

function extractTitle(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1].trim();
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title?.[1]) return title[1].trim();
  return null;
}

/**
 * Fetch a page's title, bounded and SSRF-safe. Returns null on any failure —
 * callers must treat that as "no metadata available" and fall back gracefully,
 * never as an error worth surfacing to the user.
 */
export async function fetchPageTitle(url: string): Promise<string | null> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let target: URL;
    try {
      target = new URL(current);
    } catch {
      return null;
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") return null;

    try {
      await assertPublicHost(target.hostname);
    } catch {
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(target, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "user-agent": "Mozilla/5.0 (compatible; therushabh-in-linkbot/1.0)" },
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) return null;
        current = new URL(location, target).toString();
        continue; // re-validate the new host on the next loop iteration
      }

      if (!res.ok || !res.body) return null;

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) return null;

      const reader = res.body.getReader();
      let received = 0;
      let html = "";
      const decoder = new TextDecoder();
      while (received < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break; // no need to read past <head>
      }
      await reader.cancel().catch(() => {});

      return extractTitle(html);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null; // too many redirects
}

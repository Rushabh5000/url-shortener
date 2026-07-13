// Fallback for pages whose real content only appears after JavaScript runs
// (client-side redirects, SPA-rendered titles) — the case safe-fetch-meta.ts
// can never handle since it deliberately never executes JS. Rather than
// hosting a headless browser ourselves (slow cold starts, heavy bundle),
// this delegates the JS rendering to Microlink's hosted API and just reads
// back the resolved title. Bounded to ~3s; any failure returns null.

const TIMEOUT_MS = 3000;

export async function fetchJsRenderedTitle(url: string): Promise<string | null> {
  try {
    const endpoint = new URL("https://api.microlink.io/");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("meta", "true");

    const headers: Record<string, string> = {};
    if (process.env.MICROLINK_API_KEY) headers["x-api-key"] = process.env.MICROLINK_API_KEY;

    const res = await fetch(endpoint, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;

    const json = (await res.json()) as { status?: string; data?: { title?: string } };
    if (json.status !== "success") return null;
    return json.data?.title?.trim() || null;
  } catch {
    return null;
  }
}

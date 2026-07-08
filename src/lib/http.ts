import { ForbiddenError } from "./errors";

/** Best-effort client IP from proxy headers (Vercel / Nginx / Caddy all set these). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

/**
 * CSRF defence for cookie-authenticated mutations: the browser always sends an
 * Origin header on cross-site POSTs, so we reject any Origin whose host differs
 * from the request host. API-key requests (no Origin) are unaffected.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser client (e.g. API key / server-to-server)
  const host = req.headers.get("host");
  try {
    if (new URL(origin).host !== host) {
      throw new ForbiddenError("Cross-origin request blocked");
    }
  } catch {
    throw new ForbiddenError("Cross-origin request blocked");
  }
}

/** Map any thrown error to a JSON HTTP response. */
export function errorResponse(err: unknown): Response {
  const status = typeof err === "object" && err !== null && "status" in err
    ? Number((err as { status: unknown }).status) || 500
    : 500;
  const message = err instanceof Error ? err.message : "Internal error";
  if (status >= 500) console.error(err);
  return Response.json({ error: message }, { status });
}

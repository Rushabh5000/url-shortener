import { getSession } from "./session";
import { verifyApiKey } from "./apikey";

export interface AuthContext {
  actor: string; // "email@x.com" or "apikey:<name>"
  kind: "session" | "apikey";
}

function bearer(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}

/**
 * Authenticate a request via API key (x-api-key or Bearer) OR the session cookie.
 * API keys take priority so automation never accidentally rides a browser session.
 */
export async function authenticateRequest(req: Request): Promise<AuthContext | null> {
  const key = req.headers.get("x-api-key") || bearer(req);
  if (key) {
    const apiKey = await verifyApiKey(key);
    return apiKey ? { actor: `apikey:${apiKey.name}`, kind: "apikey" } : null;
  }
  const session = await getSession();
  return session ? { actor: session.email, kind: "session" } : null;
}

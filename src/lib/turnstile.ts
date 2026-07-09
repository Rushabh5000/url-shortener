import { config } from "./config";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Cloudflare Turnstile token server-side. Returns false (never
 * throws) on any failure — callers must treat that as "not verified".
 */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!config.turnstileSecretKey || !token) return false;

  try {
    const body = new URLSearchParams({
      secret: config.turnstileSecretKey,
      response: token,
      remoteip: ip,
    });
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

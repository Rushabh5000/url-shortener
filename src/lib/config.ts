// Centralised, typed access to environment configuration.
// IMPORTANT: this module must stay edge-safe (only reads process.env and does
// string math) because it is imported by middleware, which runs on the edge.

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v == null || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

function int(v: string | undefined, fallback: number): number {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  // The app is deployed at the root domain (therushabh.in) — no subdomain.
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),

  cookieName: process.env.SESSION_COOKIE_NAME ?? "gs_session",
  sessionSecret:
    process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me-please-32chars!!",
  secureCookies: bool(process.env.SECURE_COOKIES, process.env.NODE_ENV === "production"),

  slugLength: int(process.env.SLUG_LENGTH, 6),
  reuseExisting: bool(process.env.REUSE_EXISTING, true),

  ipHashSalt: process.env.IP_HASH_SALT ?? "dev-insecure-ip-salt",

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  telegramAllowedChatIds: (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Public (unauthenticated) link creation is gated by Turnstile. Absent
  // TURNSTILE_SECRET_KEY, the public create endpoint refuses all requests
  // rather than silently allowing unprotected creation.
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
};

export function shortUrl(slug: string): string {
  return `${config.publicBaseUrl}/${slug}`;
}

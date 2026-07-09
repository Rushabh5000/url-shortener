/**
 * Register the Telegram webhook so the bot points at your deployment.
 *
 *   npm run set-telegram-webhook            # uses PUBLIC_BASE_URL from .env
 *   npm run set-telegram-webhook -- https://therushabh.in
 */
import "./load-env";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = (process.argv[2] ?? process.env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set.");
  process.exit(1);
}
if (!base || base.startsWith("http://localhost")) {
  console.error("Set PUBLIC_BASE_URL to a public https URL (Telegram can't reach localhost).");
  process.exit(1);
}

const url = `${base}/api/telegram`;
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: secret || undefined,
    allowed_updates: ["message"],
  }),
});

const data = await res.json();
console.log(data.ok ? `✓ Webhook set to ${url}` : `✗ Failed: ${JSON.stringify(data)}`);
process.exit(data.ok ? 0 : 1);

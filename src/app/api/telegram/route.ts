import { createLink } from "@/lib/links";
import { writeAudit } from "@/lib/audit";
import { config, shortUrl } from "@/lib/config";

export const runtime = "nodejs";

// Minimal Telegram bot webhook: send it a URL, it replies with a short link.
// Secured by (1) a secret token Telegram echoes in a header and (2) an allow-list
// of chat IDs. This is a SECONDARY channel — the primary flow is /quick + API keys.

interface TgUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  if (!config.telegramBotToken) return;
  await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).catch((err) => console.error("telegram send failed", err));
}

export async function POST(req: Request) {
  // Verify the webhook secret token.
  if (
    !config.telegramWebhookSecret ||
    req.headers.get("x-telegram-bot-api-secret-token") !== config.telegramWebhookSecret
  ) {
    return new Response("forbidden", { status: 403 });
  }

  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  const message = update?.message;
  if (!message?.text) return Response.json({ ok: true });

  const chatId = message.chat.id;

  // Allow-list check.
  if (
    config.telegramAllowedChatIds.length &&
    !config.telegramAllowedChatIds.includes(String(chatId))
  ) {
    await sendMessage(chatId, "Sorry, you're not authorised to use this bot.");
    return Response.json({ ok: true });
  }

  const text = message.text.trim();

  if (text === "/start" || text === "/help") {
    await sendMessage(
      chatId,
      "Send me any URL and I'll shorten it on rushabh.in.\n" +
        "Optional custom alias: put it after a space, e.g.\n" +
        "https://example.com/very/long my-alias",
    );
    return Response.json({ ok: true });
  }

  // Format: "<url> [alias]"
  const [url, alias] = text.split(/\s+/, 2);

  try {
    const { link, reused } = await createLink({
      destinationUrl: url,
      alias: alias || undefined,
      createdBy: `telegram:${chatId}`,
    });
    if (!reused) {
      await writeAudit({
        actor: `telegram:${chatId}`,
        action: "link.create",
        target: link.slug,
      });
    }
    await sendMessage(chatId, `${reused ? "Already had that one:\n" : ""}${shortUrl(link.slug)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong";
    await sendMessage(chatId, `⚠️ ${msg}`);
  }

  return Response.json({ ok: true });
}

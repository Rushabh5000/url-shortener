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
      "Send me any URL and I'll shorten it on therushabh.in.\n" +
        "Optional custom alias (single-URL messages only): put it after a space, e.g.\n" +
        "https://example.com/very/long my-alias\n" +
        "Paste text with several URLs in it and I'll shorten each one in place.",
    );
    return Response.json({ ok: true });
  }

  const urlMatches = [...text.matchAll(/https?:\/\/\S+/g)];
  if (urlMatches.length === 0) {
    await sendMessage(chatId, "Send me a URL to shorten it.");
    return Response.json({ ok: true });
  }

  // A message that's just one URL (optionally followed by a single alias
  // token) keeps the classic alias-supporting flow. Anything else — several
  // URLs, or a URL embedded in surrounding text — shortens every URL found
  // in place and returns the message with the rest of the text intact.
  const first = urlMatches[0];
  const afterFirstUrl = text.slice(first.index + first[0].length).trim();
  const isSingleWithOptionalAlias =
    urlMatches.length === 1 && first.index === 0 && !/\s/.test(afterFirstUrl);

  if (isSingleWithOptionalAlias) {
    const [url, alias] = text.split(/\s+/, 2);
    try {
      const { link, reused, affiliateAttempted, affiliateConverted } = await createLink({
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
      const conversionNote =
        !reused && affiliateAttempted && !affiliateConverted
          ? "\n(Could not convert to affiliate, just shortened it.)"
          : "";
      await sendMessage(
        chatId,
        `${reused ? "Already had that one:\n" : ""}${shortUrl(link.slug)}${conversionNote}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      await sendMessage(chatId, `⚠️ ${msg}`);
    }
    return Response.json({ ok: true });
  }

  // Multi-URL / embedded-text mode: shorten each URL in place, right to
  // left so earlier match indices stay valid as the string is rebuilt.
  let result = text;
  for (const match of [...urlMatches].reverse()) {
    const url = match[0];
    try {
      const { link, reused, affiliateAttempted, affiliateConverted } = await createLink({
        destinationUrl: url,
        createdBy: `telegram:${chatId}`,
      });
      if (!reused) {
        await writeAudit({
          actor: `telegram:${chatId}`,
          action: "link.create",
          target: link.slug,
        });
      }
      let replacement = shortUrl(link.slug);
      if (!reused && affiliateAttempted && !affiliateConverted) {
        replacement += " (not converted to affiliate)";
      }
      result = result.slice(0, match.index) + replacement + result.slice(match.index + url.length);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "failed";
      result = result.slice(0, match.index) + `${url} (⚠️ ${msg})` + result.slice(match.index + url.length);
    }
  }
  await sendMessage(chatId, result);

  return Response.json({ ok: true });
}

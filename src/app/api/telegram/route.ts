import { createLink, deleteLink, generateUniqueSlug, getLinkBySlug, listLinks, updateLink } from "@/lib/links";
import { getDashboardStats, getTopReferrersForLink } from "@/lib/stats";
import { writeAudit } from "@/lib/audit";
import { config, shortUrl } from "@/lib/config";
import { formatDate, prettyUrl, timeAgo } from "@/lib/format";

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

const HELP_TEXT =
  "Send me any URL and I'll shorten it on therushabh.in.\n" +
  "Optional custom alias (single-URL messages only): put it after a space, e.g.\n" +
  "https://example.com/very/long my-alias\n" +
  "Paste text with several URLs in it and I'll shorten each one in place.\n\n" +
  "Commands:\n" +
  "/stats — overall click stats\n" +
  "/stats <slug> — stats for one short link\n" +
  "/list [search] — recent links, optionally filtered\n" +
  "/regenerate <slug> — give a link a new random slug\n" +
  "/delete <slug> — delete a short link";

/** Accepts a bare slug or a full short URL and returns just the slug. */
function extractSlug(arg: string): string {
  const trimmed = arg.trim();
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).pathname.replace(/^\//, "");
    }
  } catch {
    // fall through, treat as a bare slug
  }
  return trimmed.replace(/^\//, "");
}

async function handleCommand(chatId: number, command: string, arg: string): Promise<void> {
  switch (command) {
    case "start":
    case "help": {
      await sendMessage(chatId, HELP_TEXT);
      return;
    }

    case "stats": {
      if (!arg) {
        const stats = await getDashboardStats();
        const top = stats.topLinks
          .map((l) => `  /${l.slug} — ${l.clickCount} clicks`)
          .join("\n") || "  (none yet)";
        await sendMessage(
          chatId,
          `Total links: ${stats.totalLinks}\n` +
            `Total clicks: ${stats.totalClicks}\n` +
            `Clicks today: ${stats.clicksToday}\n\n` +
            `Top links:\n${top}`,
        );
        return;
      }
      const slug = extractSlug(arg);
      const link = await getLinkBySlug(slug);
      if (!link) {
        await sendMessage(chatId, `No short link found for "${slug}".`);
        return;
      }
      const referrers = await getTopReferrersForLink(link.id);
      const referrerLines =
        referrers.map((r) => `  ${r.referrer ?? "(direct)"} — ${r.count}`).join("\n") || "  (none yet)";
      await sendMessage(
        chatId,
        `${shortUrl(link.slug)}\n` +
          `→ ${prettyUrl(link.destinationUrl, 80)}\n\n` +
          `Clicks: ${link.clickCount}\n` +
          `Created: ${formatDate(link.createdAt)}\n` +
          `Last click: ${timeAgo(link.lastClickedAt)}\n\n` +
          `Top referrers:\n${referrerLines}`,
      );
      return;
    }

    case "list": {
      const links = await listLinks({ q: arg || undefined, limit: 10 });
      if (links.length === 0) {
        await sendMessage(chatId, arg ? `No links match "${arg}".` : "No links yet.");
        return;
      }
      const lines = links.map((l) => `/${l.slug} — ${l.clickCount} clicks — ${prettyUrl(l.destinationUrl, 40)}`);
      await sendMessage(chatId, lines.join("\n"));
      return;
    }

    case "regenerate":
    case "regen": {
      if (!arg) {
        await sendMessage(chatId, "Usage: /regenerate <slug>");
        return;
      }
      const slug = extractSlug(arg);
      const link = await getLinkBySlug(slug);
      if (!link) {
        await sendMessage(chatId, `No short link found for "${slug}".`);
        return;
      }
      try {
        const newSlug = await generateUniqueSlug();
        const updated = await updateLink(link.id, { alias: newSlug });
        await writeAudit({ actor: `telegram:${chatId}`, action: "link.regenerate", target: updated.slug });
        await sendMessage(chatId, `${shortUrl(link.slug)} → ${shortUrl(updated.slug)}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        await sendMessage(chatId, `⚠️ ${msg}`);
      }
      return;
    }

    case "delete": {
      if (!arg) {
        await sendMessage(chatId, "Usage: /delete <slug>");
        return;
      }
      const slug = extractSlug(arg);
      const link = await getLinkBySlug(slug);
      if (!link) {
        await sendMessage(chatId, `No short link found for "${slug}".`);
        return;
      }
      await deleteLink(link.id);
      await writeAudit({ actor: `telegram:${chatId}`, action: "link.delete", target: slug });
      await sendMessage(chatId, `Deleted ${shortUrl(slug)}.`);
      return;
    }

    default: {
      await sendMessage(chatId, `Unknown command "/${command}". Send /help for a list.`);
      return;
    }
  }
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

  const commandMatch = text.match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  if (commandMatch) {
    const [, command, arg] = commandMatch;
    await handleCommand(chatId, command.toLowerCase(), (arg ?? "").trim());
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

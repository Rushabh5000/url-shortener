import { z } from "zod";
import { createLink } from "@/lib/links";
import { verifyTurnstile } from "@/lib/turnstile";
import { hashIp } from "@/lib/analytics";
import { rateLimit } from "@/lib/ratelimit";
import { assertSameOrigin, clientIp, errorResponse } from "@/lib/http";
import { writeAudit } from "@/lib/audit";
import { config, shortUrl } from "@/lib/config";

export const runtime = "nodejs";

const PUBLIC_RATE_LIMIT = 5;
const PUBLIC_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const Body = z.object({
  url: z.string().min(1).max(2048),
  captchaToken: z.string().min(1),
});

/**
 * POST /api/public/links — unauthenticated link creation for site visitors.
 * No custom alias (abuse surface: vanity-slug squatting), rate-limited per IP,
 * requires a verified Turnstile token, and every link is tagged
 * `public:<ipHash>` so the admin dashboard can flag/moderate it. Fails closed
 * (503) if Turnstile isn't configured, rather than silently allowing
 * unprotected public creation.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);

    if (!config.turnstileSecretKey) {
      return Response.json(
        { error: "Public link creation isn't available right now." },
        { status: 503 },
      );
    }

    const ip = clientIp(req);
    if (!rateLimit(`public-create:${ip}`, PUBLIC_RATE_LIMIT, PUBLIC_RATE_WINDOW_MS)) {
      return Response.json(
        { error: "You've hit the limit for creating links. Try again later." },
        { status: 429 },
      );
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "A destination URL is required." }, { status: 400 });
    }

    const captchaOk = await verifyTurnstile(parsed.data.captchaToken, ip);
    if (!captchaOk) {
      return Response.json({ error: "Captcha verification failed, please retry." }, { status: 400 });
    }

    const actor = `public:${hashIp(ip)}`;
    const { link, reused } = await createLink({
      destinationUrl: parsed.data.url,
      createdBy: actor,
    });

    if (!reused) {
      await writeAudit({ actor, action: "link.create", target: link.slug });
    }

    return Response.json(
      { slug: link.slug, shortUrl: shortUrl(link.slug), reused },
      { status: reused ? 200 : 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

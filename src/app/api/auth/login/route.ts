import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, errorResponse } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`login:${ip}`, 10, 60_000)) {
      return Response.json({ error: "Too many attempts, slow down." }, { status: 429 });
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await setSessionCookie(user);
    await writeAudit({ actor: user.email, action: "auth.login", target: user.email });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

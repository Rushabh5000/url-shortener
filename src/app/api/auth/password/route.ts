import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { assertSameOrigin, errorResponse } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }

    const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    const user = rows[0];
    if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return Response.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
      .where(eq(users.id, user.id));

    await writeAudit({ actor: user.email, action: "auth.password_change", target: user.email });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

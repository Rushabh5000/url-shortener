import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, type User } from "../db/schema";
import { config } from "./config";
import { createSessionToken, verifySessionToken } from "./session-token";

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface Session {
  userId: string;
  email: string;
}

/** Read + verify the session cookie. Returns null if missing/invalid. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(config.cookieName)?.value;
  if (!token) return null;
  try {
    const claims = await verifySessionToken(token);
    if (!claims.sub) return null;
    return { userId: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}

/** Load the full admin user for the current session. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return rows[0] ?? null;
}

export async function setSessionCookie(user: Pick<User, "id" | "email">): Promise<void> {
  const token = await createSessionToken(user.id, user.email);
  const store = await cookies();
  store.set(config.cookieName, token, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(config.cookieName);
}

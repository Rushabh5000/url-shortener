/**
 * Create (or reset the password of) the admin user.
 *
 *   npm run create-admin -- you@example.com "your-strong-password"
 *
 * Falls back to ADMIN_EMAIL / ADMIN_PASSWORD from .env if args are omitted.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? "";

if (!email || !password) {
  console.error('Usage: npm run create-admin -- <email> "<password>"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

if (existing[0]) {
  await db.update(users).set({ passwordHash }).where(eq(users.id, existing[0].id));
  console.log(`✓ Updated password for ${email}`);
} else {
  await db.insert(users).values({
    id: randomUUID(),
    email,
    passwordHash,
    createdAt: new Date(),
  });
  console.log(`✓ Created admin ${email}`);
}

process.exit(0);

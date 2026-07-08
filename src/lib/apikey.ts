import { randomBytes, createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { apiKeys, type ApiKey } from "../db/schema";

const PREFIX = "gsk_"; // "go shortener key"

export function generateApiKey(): string {
  return PREFIX + randomBytes(24).toString("base64url");
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Create a key, store only its hash, and return the raw key ONCE. */
export async function createApiKey(name: string): Promise<{ raw: string; key: ApiKey }> {
  const raw = generateApiKey();
  const row: ApiKey = {
    id: randomUUID(),
    name: name.trim() || "unnamed",
    keyHash: hashApiKey(raw),
    prefix: raw.slice(0, 12),
    createdAt: new Date(),
    lastUsedAt: null,
    disabled: false,
  };
  await db.insert(apiKeys).values(row);
  return { raw, key: row };
}

/** Look up an active key by its raw value; bumps lastUsedAt. Returns null if invalid. */
export async function verifyApiKey(raw: string): Promise<ApiKey | null> {
  if (!raw.startsWith(PREFIX)) return null;
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hashApiKey(raw)))
    .limit(1);
  const key = rows[0];
  if (!key || key.disabled) return null;
  // Fire-and-forget touch; don't block the request on it.
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .catch(() => {});
  return key;
}

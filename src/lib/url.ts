import { ValidationError } from "./errors";

// Hostnames we never allow as redirect targets (SSRF / loopback hygiene).
const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

/**
 * Normalise and validate a user-supplied destination URL.
 * - trims whitespace
 * - assumes https:// when no scheme is present (mobile-friendly)
 * - allows only http/https (blocks javascript:, data:, file:, etc.)
 * - requires a dotted hostname and blocks obvious loopback targets
 * Returns the canonical URL string, or throws ValidationError.
 */
export function normalizeAndValidateUrl(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) throw new ValidationError("Destination URL is required");
  if (trimmed.length > 2048) throw new ValidationError("URL is too long");

  let candidate = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    // No scheme at all -> assume https. (A bare "javascript:" has no // so it
    // won't match here and will fail the protocol check below.)
    candidate = `https://${candidate}`;
  }

  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    throw new ValidationError("That doesn't look like a valid URL");
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new ValidationError("Only http and https links are allowed");
  }

  const host = u.hostname.toLowerCase();
  if (!host || !host.includes(".")) {
    throw new ValidationError("URL must include a valid domain");
  }
  if (BLOCKED_HOSTS.has(host)) {
    throw new ValidationError("That destination is not allowed");
  }

  return u.toString();
}

export function isValidUrl(input: string): boolean {
  try {
    normalizeAndValidateUrl(input);
    return true;
  } catch {
    return false;
  }
}

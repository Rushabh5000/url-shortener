// Lightweight in-memory fixed-window rate limiter.
//
// Good enough for a single-user personal app on one instance. In a multi-instance
// serverless deployment this is per-instance/best-effort — swap in Upstash Redis
// or a Postgres-backed counter if you ever need strict global limits.

interface Bucket {
  count: number;
  reset: number;
}

const buckets = new Map<string, Bucket>();

/** Returns true if the action is allowed, false if the limit is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

// Occasionally sweep expired buckets so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.reset) buckets.delete(key);
  }
}, 60_000).unref?.();

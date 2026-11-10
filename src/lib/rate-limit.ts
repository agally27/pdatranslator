/**
 * Fixed-window in-memory rate limiter.
 *
 * This protects a single server instance. On serverless platforms each instance
 * keeps its own counters, so treat this as a baseline and swap `RateLimitStore`
 * for a shared store (e.g. Upstash Redis / Vercel KV) before scaling.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitStore {
  hit(key: string, limit: number, windowMs: number, now?: number): RateLimitResult;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  hit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (this.buckets.size > 5000) this.sweep(now);
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: limit >= 1, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  private sweep(now: number) {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}

const globalStore = globalThis as unknown as { __pdaRateLimit?: MemoryRateLimitStore };
export const rateLimitStore: RateLimitStore = (globalStore.__pdaRateLimit ??= new MemoryRateLimitStore());

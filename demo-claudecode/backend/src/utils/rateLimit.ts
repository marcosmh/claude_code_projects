export type RouteClass = "read" | "write" | "pdf" | "auth";

/** Requests allowed per window and client, by kind of route. */
export const LIMITS: Record<RouteClass, number> = { read: 120, write: 30, pdf: 10, auth: 10 };
export const WINDOW_MS = 60_000;

export function classify(method: string, pathname: string): RouteClass {
  // Login is the brute-force target: its own, stricter bucket.
  if (method === "POST" && pathname.endsWith("/auth/login")) return "auth";
  if (method === "GET" && pathname.endsWith("/pdf")) return "pdf";
  return method === "GET" || method === "HEAD" ? "read" : "write";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window ends. */
  retryAfter: number;
}

/**
 * Fixed-window counter kept in memory: it protects a single instance. With several
 * instances (or serverless) each one counts on its own; use a shared store (Redis) then.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly windowMs = WINDOW_MS,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  hit(key: string, limit: number): RateLimitResult {
    const now = this.now();
    if (this.buckets.size >= this.maxKeys) this.sweep(now);
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= limit,
      limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  private sweep(now: number): void {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}

/**
 * Client key. `X-Forwarded-For` is only trustworthy behind a reverse proxy that sets it;
 * without one a client can spoof it to dodge the limit.
 */
export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}

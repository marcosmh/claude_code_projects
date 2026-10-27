export type RouteClass = "read" | "write" | "pdf" | "auth" | "refresh";

/** Requests allowed per window and client, by kind of route. */
export const LIMITS: Record<RouteClass, number> = { read: 120, write: 30, pdf: 10, auth: 10, refresh: 20 };
export const WINDOW_MS = 60_000;

export function classify(method: string, pathname: string): RouteClass {
  // Refresh has its own bucket: a replayed or guessed refresh token must not eat the login budget, nor the other way round.
  if (method === "POST" && pathname.endsWith("/auth/refresh")) return "refresh";
  // Login is the brute-force target: its own, stricter bucket.
  if (method === "POST" && (pathname.endsWith("/auth/login") || pathname.endsWith("/auth/password"))) return "auth";
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

/** Login attempts per minute and normalised email, on top of the per-IP bucket. */
export const EMAIL_LOGIN_LIMIT = 10;

/**
 * Fixed-window counter kept in memory: it protects a single instance. With several
 * instances (or serverless) each one counts on its own; use a shared store (Redis) then.
 * Memory is bounded: expired windows are swept at most once per window, and at `maxKeys` the oldest bucket goes.
 */
export class RateLimiter {
  // A Map iterates in insertion order and live buckets are never re-inserted, so the first key is the oldest.
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private nextSweepAt: number;

  constructor(
    private readonly windowMs = WINDOW_MS,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {
    this.nextSweepAt = this.now() + windowMs;
  }

  hit(key: string, limit: number): RateLimitResult {
    const now = this.now();
    // Amortised: O(n) once per window instead of once per request.
    if (now >= this.nextSweepAt) this.sweep(now);
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (bucket) this.buckets.delete(key);
      // Hard cap: under a flood of distinct keys drop the oldest instead of growing without bound.
      while (this.buckets.size >= this.maxKeys) {
        const oldest = this.buckets.keys().next();
        if (oldest.done) break;
        this.buckets.delete(oldest.value);
      }
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
    this.nextSweepAt = now + this.windowMs;
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}

const MAX_TRUSTED_HOPS = 10;

/** `TRUSTED_PROXY_HOPS`: how many reverse proxies in front of the API append to X-Forwarded-For. 0 (default) = none. */
export function trustedProxyHops(env: string | undefined = process.env.TRUSTED_PROXY_HOPS): number {
  if (!env || !/^\d{1,2}$/.test(env.trim())) return 0;
  return Math.min(Number(env), MAX_TRUSTED_HOPS);
}

/**
 * Client IP, or null when there is no trustworthy source.
 * Next 16 route handlers and the proxy expose no socket address (`NextRequest.ip` was removed in 15), so the IP can
 * only come from headers, and a client can forge any header it sends. Hence:
 * - hops = 0 (default): X-Forwarded-For and X-Real-IP are ignored.
 * - hops = N > 0: the Nth entry from the right of X-Forwarded-For (appended by our outermost trusted proxy;
 *   everything to its left is client-controlled). Without enough entries, X-Real-IP (set by that proxy) is used.
 */
export function clientKey(headers: Headers, hops: number = trustedProxyHops()): string | null {
  if (hops <= 0) return null;
  const entries = (headers.get("x-forwarded-for") ?? "").split(",").map((entry) => entry.trim());
  const fromChain = entries.length >= hops ? entries[entries.length - hops] : undefined;
  const ip = fromChain || headers.get("x-real-ip")?.trim();
  return ip ? ip.slice(0, 64) : null;
}

/**
 * Bucket key for a request: the IP when trustworthy; otherwise a shared "local" bucket outside production
 * (development convenience) and, in production, the caller's credential (token tail), never a global shared bucket.
 * Requests with neither IP nor credential get null (no bucket): login is covered by the per-email limit.
 */
export function bucketKey(
  headers: Headers,
  production: boolean = process.env.NODE_ENV === "production",
  hops: number = trustedProxyHops(),
): string | null {
  const ip = clientKey(headers, hops);
  if (ip) return `ip:${ip}`;
  if (!production) return "local";
  const bearer = headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const refresh = headers.get("cookie")?.match(/(?:^|;\s*)(?:__Secure-)?refresh=([^;]+)/)?.[1];
  const credential = bearer ?? refresh;
  return credential ? `cred:${credential.slice(-32)}` : null;
}

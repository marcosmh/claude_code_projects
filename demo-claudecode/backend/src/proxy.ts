import { NextResponse, type NextRequest } from "next/server";
import { allowedOrigins, corsHeaders, usesRefreshCookie } from "./utils/cors";
import { accessCookieEnabled } from "./utils/cookies";
import { failure } from "./utils/http";
import { LIMITS, RateLimiter, bucketKey, classify } from "./utils/rateLimit";

const limiter = new RateLimiter();
// Test-only switch (the E2E suite fires far more than 30 writes/min from one IP). Never honoured in production.
const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "1" && process.env.NODE_ENV !== "production";

// Next 16 renamed `middleware` to `proxy`. Handles CORS (incl. preflight) and rate limiting for the API.
export function proxy(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"), allowedOrigins(), usesRefreshCookie(request.nextUrl.pathname) || accessCookieEnabled());

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  // Bearer tokens are not sent by the browser on their own, but the refresh cookie is: a write from a foreign
  // origin must never get through (defence in depth on top of SameSite=Strict).
  // Requests without Origin (curl, server-to-server) carry no browser cookie jar and are unaffected.
  const origin = request.headers.get("origin");
  const isWrite = request.method !== "GET" && request.method !== "HEAD";
  if (isWrite && origin && !allowedOrigins().includes(origin)) {
    return failure(403, "FORBIDDEN", "Origen no permitido");
  }
  // Fetch Metadata is set by the browser and cannot be forged by page scripts: a write that the browser itself
  // marks as cross-site is refused even when Origin is missing or looks fine. Absent header (curl, old browsers) is not blocked.
  if (isWrite && request.headers.get("sec-fetch-site") === "cross-site") {
    return failure(403, "FORBIDDEN", "Origen no permitido");
  }

  if (rateLimitDisabled) {
    const passthrough = NextResponse.next();
    for (const [key, value] of Object.entries(headers)) passthrough.headers.set(key, value);
    return passthrough;
  }

  const routeClass = classify(request.method, request.nextUrl.pathname);
  const key = bucketKey(request.headers);
  // No trustworthy IP and no credential (production without TRUSTED_PROXY_HOPS): no shared bucket; see README.
  if (key === null) {
    const passthrough = NextResponse.next();
    for (const [name, value] of Object.entries(headers)) passthrough.headers.set(name, value);
    return passthrough;
  }
  const result = limiter.hit(`${key}:${routeClass}`, LIMITS[routeClass]);
  const limitHeaders = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
  };

  if (!result.allowed) {
    // CORS headers are kept so the browser lets the frontend read the 429.
    return failure(429, "RATE_LIMITED", "Demasiadas peticiones, inténtalo de nuevo en unos segundos", undefined, {
      ...headers,
      ...limitHeaders,
      "Retry-After": String(result.retryAfter),
    });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries({ ...headers, ...limitHeaders })) response.headers.set(key, value);
  return response;
}

export const config = { matcher: "/api/:path*" };

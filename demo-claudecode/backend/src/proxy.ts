import { NextResponse, type NextRequest } from "next/server";
import { corsHeaders } from "./utils/cors";
import { failure } from "./utils/http";
import { LIMITS, RateLimiter, classify, clientKey } from "./utils/rateLimit";

const limiter = new RateLimiter();

// Next 16 renamed `middleware` to `proxy`. Handles CORS (incl. preflight) and rate limiting for the API.
export function proxy(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const routeClass = classify(request.method, request.nextUrl.pathname);
  const result = limiter.hit(`${clientKey(request.headers)}:${routeClass}`, LIMITS[routeClass]);
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

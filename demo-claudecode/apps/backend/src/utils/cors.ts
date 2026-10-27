const DEFAULT_ORIGIN = "http://localhost:5173";

export function allowedOrigins(env: string | undefined = process.env.FRONTEND_ORIGIN): string[] {
  return (env || DEFAULT_ORIGIN)
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

// The access token travels in `Authorization`, which needs no credentials mode. Only the endpoints that
// read or set the httpOnly refresh cookie do (it is scoped to Path=/api/v1/auth).
const COOKIE_ROUTES = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/password"];

/** True for the endpoints that exchange the refresh cookie, so only they get `Allow-Credentials`. */
export const usesRefreshCookie = (pathname: string) => COOKIE_ROUTES.some((route) => pathname.endsWith(route));

/**
 * Returns the CORS headers for a request origin, or an empty object if it is not allowed.
 * `Authorization` is allowed only for the configured frontend origins; credentials only when `withCredentials`.
 */
export function corsHeaders(
  origin: string | null,
  allowed = allowedOrigins(),
  withCredentials = false,
): Record<string, string> {
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...(withCredentials ? { "Access-Control-Allow-Credentials": "true" } : {}),
    "Access-Control-Expose-Headers":
      "Content-Disposition, Location, Retry-After, RateLimit-Limit, RateLimit-Remaining, X-Request-Id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

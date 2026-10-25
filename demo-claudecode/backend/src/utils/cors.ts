const DEFAULT_ORIGIN = "http://localhost:5173";

export function allowedOrigins(env: string | undefined = process.env.FRONTEND_ORIGIN): string[] {
  return (env || DEFAULT_ORIGIN)
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/** Returns the CORS headers for a request origin, or an empty object if it is not allowed. */
export function corsHeaders(origin: string | null, allowed = allowedOrigins()): Record<string, string> {
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    // The session lives in an httpOnly cookie, so the browser must be allowed to send and accept it.
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Expose-Headers":
      "Content-Disposition, Location, Retry-After, RateLimit-Limit, RateLimit-Remaining, X-Request-Id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

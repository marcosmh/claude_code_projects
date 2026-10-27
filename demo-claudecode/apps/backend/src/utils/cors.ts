const DEFAULT_ORIGIN = "http://localhost:5173";

export function allowedOrigins(env: string | undefined = process.env.FRONTEND_ORIGIN): string[] {
  return (env || DEFAULT_ORIGIN)
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * In production FRONTEND_ORIGIN is mandatory (no silent localhost default) and every entry must be a bare https
 * origin: no wildcard, no path, no localhost. It feeds both the CORS allowlist and the CSRF check, so a lax value
 * would widen both. The error names the offending entry's problem, never anything secret.
 */
export function assertProductionOrigins(env: Record<string, string | undefined> = process.env): void {
  if (env.NODE_ENV !== "production") return;
  if (!env.FRONTEND_ORIGIN?.trim()) throw new Error("FRONTEND_ORIGIN es obligatorio en producción (origen https del frontend)");
  for (const origin of allowedOrigins(env.FRONTEND_ORIGIN)) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`FRONTEND_ORIGIN contiene un origen no válido: ${origin}`);
    }
    if (origin.includes("*")) throw new Error("FRONTEND_ORIGIN no admite comodines");
    if (url.protocol !== "https:") throw new Error(`FRONTEND_ORIGIN debe usar https en producción: ${origin}`);
    if (LOCAL_HOSTS.has(url.hostname)) throw new Error(`FRONTEND_ORIGIN no puede apuntar a localhost en producción: ${origin}`);
    if (url.origin !== origin) throw new Error(`FRONTEND_ORIGIN debe ser solo un origen (sin ruta ni credenciales): ${origin}`);
  }
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

export const REFRESH_COOKIE = "refresh";
/** Production name: the `__Secure-` prefix makes browsers refuse the cookie unless it is Secure (dev runs on http). */
export const refreshCookieName = (secure = isSecure()) => (secure ? `__Secure-${REFRESH_COOKIE}` : REFRESH_COOKIE);
/** The browser only sends the refresh cookie to the auth endpoints, never to invoices or stats. */
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

/** Returns the value of cookie `name` from a `Cookie` header, or null. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim() || null;
  }
  return null;
}

/** The access token cookie travels to every API route (invoices, stats, auth), never outside the API. */
export const ACCESS_COOKIE_PATH = "/api/v1";

/**
 * Dual mode (decision 6 of docs/jwt-migration.md): login and refresh also set the access token in an httpOnly cookie
 * and `withAuth` accepts it. On by default because the frontend no longer sends `Authorization`; `AUTH_COOKIE_ACCESS=0`
 * turns it off (Bearer-only clients keep working either way).
 */
export const accessCookieEnabled = () => process.env.AUTH_COOKIE_ACCESS !== "0";

// The `__Secure-` prefix makes browsers refuse the cookie unless it is Secure, so it only exists in production
// (dev and E2E run over plain http).
export const accessCookieName = (secure = isSecure()) => (secure ? "__Secure-at" : "at");

// HttpOnly keeps the tokens away from page scripts. SameSite=Strict is possible because the frontend and the API
// share a site (same origin in production; localhost:5173 and localhost:4000 in dev); Secure is added outside dev.
function attributes(path: string, secure: boolean): string[] {
  return [`Path=${path}`, "HttpOnly", "SameSite=Strict", ...(secure ? ["Secure"] : [])];
}

function isSecure() {
  return process.env.NODE_ENV === "production";
}

export function refreshCookie(token: string, maxAgeSeconds: number, secure = isSecure()): string {
  return [`${refreshCookieName(secure)}=${token}`, `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`, ...attributes(REFRESH_COOKIE_PATH, secure)].join("; ");
}

export function clearedRefreshCookie(secure = isSecure()): string {
  return [`${refreshCookieName(secure)}=`, "Max-Age=0", ...attributes(REFRESH_COOKIE_PATH, secure)].join("; ");
}

export function accessCookie(token: string, maxAgeSeconds: number, secure = isSecure()): string {
  return [
    `${accessCookieName(secure)}=${token}`,
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    ...attributes(ACCESS_COOKIE_PATH, secure),
  ].join("; ");
}

export function clearedAccessCookie(secure = isSecure()): string {
  return [`${accessCookieName(secure)}=`, "Max-Age=0", ...attributes(ACCESS_COOKIE_PATH, secure)].join("; ");
}

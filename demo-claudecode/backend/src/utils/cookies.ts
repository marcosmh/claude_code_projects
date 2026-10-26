export const REFRESH_COOKIE = "refresh";
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

// HttpOnly keeps the refresh token away from page scripts. SameSite=Strict is possible because the
// frontend and the API must share a site (localhost:5173 and localhost:4000 today; one registrable domain
// in production); Secure is added outside dev.
function attributes(secure: boolean): string[] {
  return [`Path=${REFRESH_COOKIE_PATH}`, "HttpOnly", "SameSite=Strict", ...(secure ? ["Secure"] : [])];
}

const isSecure = () => process.env.NODE_ENV === "production";

export function refreshCookie(token: string, maxAgeSeconds: number, secure = isSecure()): string {
  return [`${REFRESH_COOKIE}=${token}`, `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`, ...attributes(secure)].join("; ");
}

export function clearedRefreshCookie(secure = isSecure()): string {
  return [`${REFRESH_COOKIE}=`, "Max-Age=0", ...attributes(secure)].join("; ");
}

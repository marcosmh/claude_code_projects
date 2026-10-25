export const SESSION_COOKIE = "session";

/** Returns the value of cookie `name` from a `Cookie` header, or null. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim() || null;
  }
  return null;
}

// HttpOnly keeps the token away from page scripts. SameSite=Lax is enough because the frontend
// and the API share a site (localhost:5173 and localhost:4000); Secure is added outside dev.
function attributes(secure: boolean): string[] {
  return ["Path=/", "HttpOnly", "SameSite=Lax", ...(secure ? ["Secure"] : [])];
}

const isSecure = () => process.env.NODE_ENV === "production";

export function sessionCookie(token: string, maxAgeSeconds: number, secure = isSecure()): string {
  return [`${SESSION_COOKIE}=${token}`, `Max-Age=${maxAgeSeconds}`, ...attributes(secure)].join("; ");
}

export function clearedSessionCookie(secure = isSecure()): string {
  return [`${SESSION_COOKIE}=`, "Max-Age=0", ...attributes(secure)].join("; ");
}

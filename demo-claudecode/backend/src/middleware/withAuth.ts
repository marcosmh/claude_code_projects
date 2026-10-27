import type { AuthUser, UserRole } from "../types";
import { accessCookieEnabled, accessCookieName, readCookie } from "../utils/cookies";
import { isSameSiteWrite } from "../utils/csrf";
import { ForbiddenError } from "../utils/errors";
import { withErrorHandler } from "./withErrorHandler";

/** Extracts the token from `Authorization: Bearer <token>`; null for anything else. */
export function bearerToken(request: Request): string | null {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization")?.trim() ?? "");
  return match ? match[1] : null;
}

/**
 * The access token of a request and where it came from. `Authorization: Bearer` wins and the cookie is then ignored,
 * so the two sources never mix. The cookie is only read in dual mode (`AUTH_COOKIE_ACCESS=1`).
 */
export function credentialFrom(request: Request): { token: string | null; source: "bearer" | "cookie" | null } {
  const bearer = bearerToken(request);
  if (bearer) return { token: bearer, source: "bearer" };
  if (accessCookieEnabled()) {
    const cookie = readCookie(request.headers.get("cookie"), accessCookieName());
    if (cookie) return { token: cookie, source: "cookie" };
  }
  return { token: null, source: null };
}

type AuthedHandler<Args extends unknown[]> = (user: AuthUser, ...args: Args) => Promise<Response>;

/**
 * Builds the wrapper that protects a route: it resolves the access token (Authorization: Bearer, or the access cookie in dual mode) to a
 * user (401 otherwise) and hands that user to the handler, which must scope everything it does to it.
 */
export function createWithAuth(authenticate: (accessToken: string | null) => Promise<AuthUser>) {
  return function withAuth<Args extends [Request, ...unknown[]]>(
    handler: AuthedHandler<Args>,
  ): (...args: Args) => Promise<Response> {
    return withErrorHandler(async (...args: Args) => {
      const { token, source } = credentialFrom(args[0]);
      // A cookie is sent by the browser on its own, so a write that relies on it must come from our frontend (CSRF).
      if (source === "cookie" && !isSameSiteWrite(args[0])) throw new ForbiddenError("Origen no permitido");
      const user = await authenticate(token);
      return handler(user, ...args);
    });
  };
}

/**
 * Role check on top of `withAuth`: `withRole("ADMIN")(handler)`. A wrong role is 403 (the caller is known and
 * the endpoint is not theirs). Ownership of data is a different rule: another user's invoice stays a 404.
 */
export function createWithRole(withAuth: ReturnType<typeof createWithAuth>) {
  return function withRole(...roles: UserRole[]) {
    return function <Args extends [Request, ...unknown[]]>(
      handler: AuthedHandler<Args>,
    ): (...args: Args) => Promise<Response> {
      return withAuth<Args>(async (user, ...args) => {
        if (!roles.includes(user.role)) throw new ForbiddenError("No tienes permiso para realizar esta acción");
        return handler(user, ...args);
      });
    };
  };
}

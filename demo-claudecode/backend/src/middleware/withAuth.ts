import type { AuthUser, UserRole } from "../types";
import { ForbiddenError } from "../utils/errors";
import { withErrorHandler } from "./withErrorHandler";

/** Extracts the token from `Authorization: Bearer <token>`; null for anything else. */
export function bearerToken(request: Request): string | null {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization")?.trim() ?? "");
  return match ? match[1] : null;
}

type AuthedHandler<Args extends unknown[]> = (user: AuthUser, ...args: Args) => Promise<Response>;

/**
 * Builds the wrapper that protects a route: it resolves the access token (Authorization: Bearer) to a
 * user (401 otherwise) and hands that user to the handler, which must scope everything it does to it.
 */
export function createWithAuth(authenticate: (accessToken: string | null) => Promise<AuthUser>) {
  return function withAuth<Args extends [Request, ...unknown[]]>(
    handler: AuthedHandler<Args>,
  ): (...args: Args) => Promise<Response> {
    return withErrorHandler(async (...args: Args) => {
      const user = await authenticate(bearerToken(args[0]));
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

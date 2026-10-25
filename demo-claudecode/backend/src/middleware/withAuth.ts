import { sessionToken } from "../controllers/AuthController";
import type { AuthUser } from "../types";
import { withErrorHandler } from "./withErrorHandler";

/**
 * Builds the wrapper that protects a route: it resolves the session cookie to a user (401
 * otherwise) and hands that user to the handler, which must scope everything it does to it.
 */
export function createWithAuth(authenticate: (token: string | null) => Promise<AuthUser>) {
  return function withAuth<Args extends [Request, ...unknown[]]>(
    handler: (user: AuthUser, ...args: Args) => Promise<Response>,
  ): (...args: Args) => Promise<Response> {
    return withErrorHandler(async (...args: Args) => {
      const user = await authenticate(sessionToken(args[0]));
      return handler(user, ...args);
    });
  };
}

import { errorResponse } from "../utils/http";

/** Wraps a route handler so any thrown error becomes a consistent JSON error response. */
export function withErrorHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

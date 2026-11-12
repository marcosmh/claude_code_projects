import {
  BadGatewayError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "@/lib/errors";
import { errorResponse } from "./api-response";

/** Traduce los errores de dominio a su código HTTP; lo inesperado responde 500 sin detalles internos. */
export function domainErrorResponse(error: unknown, routeLabel: string): Response {
  if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
  if (error instanceof ForbiddenError) return errorResponse(error.message, 403);
  if (error instanceof NotFoundError) return errorResponse(error.message, 404);
  if (error instanceof ConflictError) return errorResponse(error.message, 409);
  if (error instanceof ValidationError) return errorResponse(error.message, 400);
  if (error instanceof PayloadTooLargeError) return errorResponse(error.message, 413);
  if (error instanceof UnsupportedMediaTypeError) return errorResponse(error.message, 415);
  if (error instanceof BadGatewayError) return errorResponse(error.message, 502);
  if (error instanceof ServiceUnavailableError) return errorResponse(error.message, 503);
  if (error instanceof TooManyRequestsError) {
    const response = errorResponse(error.message, 429);
    response.headers.set("Retry-After", String(error.retryAfterSeconds));
    return response;
  }
  console.error(`${routeLabel} falló:`, error);
  return errorResponse("Error interno del servidor", 500);
}

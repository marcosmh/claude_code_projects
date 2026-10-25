import { ZodError } from "zod";
import { AppError, type ErrorDetail } from "./errors";

export interface ErrorBody {
  error: { code: string; message: string; details?: ErrorDetail[] };
}

export function ok<T>(data: T, meta?: object, status = 200): Response {
  return Response.json(meta ? { data, meta } : { data }, { status });
}

export function created<T>(data: T, location?: string): Response {
  const response = ok(data, undefined, 201);
  if (location) response.headers.set("Location", location);
  return response;
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return failure(400, "VALIDATION_ERROR", "Datos de entrada inválidos", zodDetails(error));
  }
  if (error instanceof AppError) {
    return failure(error.status, error.code, error.message, error.details);
  }
  // Never leak internals: log server-side, respond generically.
  console.error("Unhandled error:", error);
  return failure(500, "INTERNAL_ERROR", "Error interno del servidor");
}

function failure(status: number, code: string, message: string, details?: ErrorDetail[]): Response {
  const body: ErrorBody = { error: { code, message, ...(details?.length ? { details } : {}) } };
  return Response.json(body, { status });
}

function zodDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || undefined,
    message: issue.message,
  }));
}

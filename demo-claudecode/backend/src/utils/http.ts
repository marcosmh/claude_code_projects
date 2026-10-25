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
  const prismaCode = prismaErrorCode(error);
  if (prismaCode === "P2025") return failure(404, "NOT_FOUND", "Recurso no encontrado");
  if (prismaCode === "P2002") return failure(409, "CONFLICT", "El recurso entra en conflicto con uno existente");
  // Never leak internals: respond generically and log server-side with a correlation id.
  const requestId = crypto.randomUUID();
  logUnhandled(error, requestId);
  return failure(500, "INTERNAL_ERROR", "Error interno del servidor", undefined, {
    "X-Request-Id": requestId,
  });
}

/** Known Prisma request errors, detected by shape so utils/ stays free of Prisma imports. */
function prismaErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && error.name === "PrismaClientKnownRequestError") {
    const { code } = error as Error & { code?: unknown };
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Logs name, code and stack frames only. Error messages (Prisma's include the query
 * arguments, i.e. client data) are deliberately left out of the logs.
 */
function logUnhandled(error: unknown, requestId: string): void {
  const err = error instanceof Error ? error : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      event: "unhandled_error",
      requestId,
      name: err?.name ?? typeof error,
      code: prismaErrorCode(error),
      frames: err?.stack?.split("\n").slice(1, 8).map((l) => l.trim()),
    }),
  );
}

export function failure(
  status: number,
  code: string,
  message: string,
  details?: ErrorDetail[],
  headers?: Record<string, string>,
): Response {
  const body: ErrorBody = { error: { code, message, ...(details?.length ? { details } : {}) } };
  return Response.json(body, { status, headers });
}

function zodDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || undefined,
    message: issue.message,
  }));
}

import { TooManyRequestsError } from "@/lib/errors";
import { createRateLimiter, type RateLimiter } from "./rate-limiter";

const MINUTE_MS = 60_000;

/** Intentos fallidos de login por email antes del bloqueo (spec §56). */
export const MAX_FAILED_LOGINS = 5;
export const LOGIN_LOCKOUT_MS = 5 * MINUTE_MS;

/**
 * IP del cliente: primer valor de `x-forwarded-for` (sin el prefijo IPv4 mapeado `::ffff:`); sin
 * él, un grupo común «desconocida».
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded ? forwarded.replace(/^::ffff:/i, "") : "desconocida";
}

function describeWait(seconds: number): string {
  return seconds >= 60 ? `${Math.ceil(seconds / 60)} minuto(s)` : `${seconds} segundo(s)`;
}

/** Lanza `TooManyRequestsError` (429) si el limitador ya bloquea la clave. */
export function assertNotBlocked(limiter: RateLimiter, key: string, message: string): void {
  const status = limiter.check(key);
  if (status.isBlocked) {
    throw new TooManyRequestsError(
      `${message} Inténtalo de nuevo en ${describeWait(status.retryAfterSeconds)}.`,
      status.retryAfterSeconds,
    );
  }
}

export const failedLoginLimiter = createRateLimiter({
  maxEvents: MAX_FAILED_LOGINS,
  windowMs: LOGIN_LOCKOUT_MS,
});
const authRequestLimiter = createRateLimiter({ maxEvents: 30, windowMs: MINUTE_MS });
const inquiryRequestLimiter = createRateLimiter({ maxEvents: 10, windowMs: MINUTE_MS });

/** Cuenta la petición contra el límite por IP y la rechaza (429) si lo supera. */
function limitRequestsPerIp(limiter: RateLimiter, request: Request, message: string): void {
  const clientIp = getClientIp(request);
  assertNotBlocked(limiter, clientIp, message);
  limiter.record(clientIp);
}

export const limitAuthRequests = (request: Request) =>
  limitRequestsPerIp(authRequestLimiter, request, "Demasiadas solicitudes.");
export const limitInquiryRequests = (request: Request) =>
  limitRequestsPerIp(inquiryRequestLimiter, request, "Demasiadas consultas enviadas.");

export const assertLoginAllowed = (email: string) =>
  assertNotBlocked(failedLoginLimiter, email, "Demasiados intentos fallidos.");

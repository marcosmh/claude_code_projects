import { ApiError } from "@/services/apiClient";

/** Máxima espera (s) que se acepta para reintentar sola una lectura tras un 429. */
export const MAX_AUTO_RETRY_WAIT_S = 10;

/** Mensaje listo para mostrar: el de la API si es un `ApiError`, si no el `fallback`. */
export function errorMessage(error: unknown, fallback = "Ocurrió un error inesperado. Inténtalo de nuevo.") {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Política de reintentos de las lecturas (las mutaciones no se reintentan nunca): un solo
 * reintento, y solo si puede servir. Los 4xx no (repetirlos no cambia nada); un 429 sí,
 * pero solo si el servidor pide una espera corta.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (!(error instanceof ApiError)) return true;
  if (error.status === 429) return error.retryAfter !== undefined && error.retryAfter <= MAX_AUTO_RETRY_WAIT_S;
  return error.status === 0 || error.status >= 500;
}

/** Espera antes de reintentar (ms): la que pidió el servidor en un 429; si no, exponencial. */
export function retryDelay(failureCount: number, error: unknown): number {
  if (error instanceof ApiError && error.status === 429 && error.retryAfter) return error.retryAfter * 1000 + 250;
  return Math.min(1000 * 2 ** failureCount, 30_000);
}

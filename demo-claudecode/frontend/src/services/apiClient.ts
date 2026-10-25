import type { ApiEnvelope, ApiErrorDetail } from "@/types/api";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/+$/, "");

/** Error normalizado de la API: `{ error: { code, message, details } }` o fallo de red. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];
  /** Segundos de espera que pidió el servidor (cabecera `Retry-After`, p. ej. en un 429). */
  readonly retryAfter?: number;

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = [], retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

let unauthorizedHandler: (() => void) | undefined;

/**
 * Se invoca cuando la API responde 401 a una petición normal (sesión caducada o revocada).
 * Las rutas `/auth/*` quedan fuera: ahí un 401 es una respuesta esperada (credenciales erróneas, sin sesión).
 */
export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

export function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_URL}${path}${qs ? `?${qs}` : ""}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toDetails(value: unknown): ApiErrorDetail[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((d): ApiErrorDetail[] => {
    if (!isRecord(d) || typeof d.message !== "string") return [];
    return [typeof d.field === "string" ? { field: d.field, message: d.message } : { message: d.message }];
  });
}

function parseRetryAfter(response: Response): number | undefined {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

const rateLimitMessage = (retryAfter?: number) =>
  retryAfter
    ? `Has hecho demasiadas peticiones. Espera ${retryAfter} s e inténtalo de nuevo.`
    : "Has hecho demasiadas peticiones. Espera unos segundos e inténtalo de nuevo.";

async function toApiError(response: Response): Promise<ApiError> {
  const retryAfter = parseRetryAfter(response);
  if (response.status === 429) {
    return new ApiError(429, "RATE_LIMITED", rateLimitMessage(retryAfter), [], retryAfter);
  }
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && isRecord(body.error) && typeof body.error.message === "string") {
      const code = typeof body.error.code === "string" ? body.error.code : "UNKNOWN_ERROR";
      return new ApiError(response.status, code, body.error.message, toDetails(body.error.details));
    }
  } catch {
    // Cuerpo no JSON: se cae al mensaje genérico.
  }
  return new ApiError(response.status, "UNKNOWN_ERROR", "El servidor respondió con un error inesperado");
}

/** Ejecuta la petición y devuelve la envoltura `{ data, meta }`; en 204 devuelve `data: undefined`. */
export async function request<T, M = undefined>(
  path: string,
  { method = "GET", body, query, signal }: RequestOptions = {},
): Promise<ApiEnvelope<T, M>> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      // La sesión vive en una cookie httpOnly que el navegador envía a la API (otro origen).
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (error.status === 401 && !path.startsWith("/auth/")) unauthorizedHandler?.();
    throw error;
  }
  if (response.status === 204) return { data: undefined as T };
  return (await response.json()) as ApiEnvelope<T, M>;
}

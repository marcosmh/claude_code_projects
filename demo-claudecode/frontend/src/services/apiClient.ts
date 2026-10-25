import type { ApiEnvelope, ApiErrorDetail } from "@/types/api";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/+$/, "");

/** Error normalizado de la API: `{ error: { code, message, details } }` o fallo de red. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
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

async function toApiError(response: Response): Promise<ApiError> {
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
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return { data: undefined as T };
  return (await response.json()) as ApiEnvelope<T, M>;
}

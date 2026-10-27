import type { ApiEnvelope, ApiErrorDetail } from "@/types/api";
import type { AuthSession } from "@/types/auth";
import { lastRefreshAt, markRefreshedNow } from "./sessionFlags";

export const API_URL = (import.meta.env.VITE_API_URL ?? "/api/v1").replace(/\/+$/, "");

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
 * Se invoca cuando la API responde 401 a una petición normal y la renovación de la sesión (`/auth/refresh`) tampoco
 * la recupera (sesión caducada o revocada).
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

const isAuthPath = (path: string) => path.startsWith("/auth/");

/**
 * Una sola petición HTTP, sin lógica de sesión. Convierte los fallos de red en `ApiError`. Los tokens viajan en cookies
 * httpOnly, por eso todas las peticiones llevan `credentials: "include"` (con el mismo origen no hay CORS de por medio).
 */
async function send(path: string, { method = "GET", body, query, signal }: RequestOptions): Promise<Response> {
  try {
    return await fetch(buildUrl(path, query), {
      method,
      signal,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
  }
}

async function requestRefresh(): Promise<AuthSession> {
  const response = await send("/auth/refresh", { method: "POST" });
  if (!response.ok) throw await toApiError(response);
  const session = ((await response.json()) as ApiEnvelope<AuthSession>).data;
  markRefreshedNow();
  return session;
}

/**
 * Serializa la renovación entre pestañas con la Web Locks API: el refresh rota, y dos pestañas que lo usan a la vez
 * hacen que la segunda parezca una reutilización (se revoca la sesión en ambas). Sin Locks API (jsdom, navegadores
 * antiguos) solo queda el single-flight de esta pestaña.
 */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  return locks ? locks.request("refresh", task) : task();
}

let refreshInFlight: Promise<AuthSession | null> | null = null;

/**
 * Single-flight de esta pestaña + lock entre pestañas. Con `sentAt` definido (instante en que se envió la petición que
 * dio 401), dentro del lock se comprueba si alguna pestaña renovó después: entonces no se llama al refresh y devuelve
 * `null`, y quien llama repite su petición con las cookies nuevas.
 */
function sharedRefresh(sentAt?: number): Promise<AuthSession | null> {
  refreshInFlight ??= withRefreshLock(async () => {
    if (sentAt !== undefined && lastRefreshAt() > sentAt) return null;
    return requestRefresh();
  }).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Renueva la sesión con la cookie del refresh (single-flight: las llamadas concurrentes comparten una sola petición,
 * imprescindible porque el refresh rota y reutilizar uno viejo revoca toda la sesión). El servidor fija las cookies
 * nuevas; devuelve la sesión y lanza `ApiError` (401 si no hay sesión recuperable).
 */
export async function refreshSession(): Promise<AuthSession> {
  // `null` solo si nos unimos a una renovación que se resolvió porque otra pestaña ya había renovado: se repite.
  return (await sharedRefresh()) ?? refreshSession();
}

/**
 * Tras un 401: `true` si ya hay una renovación posterior al envío (otra petición o pestaña) o si el refresh lo
 * consigue; `false` si el refresh dice que no hay sesión. Otros fallos del refresh (red, 5xx, 429) se propagan: no son
 * motivo para cerrar la sesión.
 */
async function recoverFromUnauthorized(sentAt: number): Promise<boolean> {
  if (lastRefreshAt() > sentAt) return true;
  try {
    await sharedRefresh(sentAt);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}

/**
 * Ejecuta la petición con la lógica de sesión y devuelve la respuesta ya validada (`ok`).
 * Ante un 401 fuera de `/auth/*` intenta una renovación y repite la petición UNA vez (sin bucles: el reintento no
 * vuelve a renovar). Si no se recupera, avisa al manejador de sesión caducada.
 */
async function execute(path: string, options: RequestOptions): Promise<Response> {
  const sentAt = Date.now();
  let response = await send(path, options);

  if (response.status === 401 && !isAuthPath(path)) {
    if (await recoverFromUnauthorized(sentAt)) response = await send(path, options);
    if (response.status === 401) {
      const error = await toApiError(response);
      unauthorizedHandler?.();
      throw error;
    }
  }

  if (!response.ok) throw await toApiError(response);
  return response;
}

/** Ejecuta la petición y devuelve la envoltura `{ data, meta }`; en 204 devuelve `data: undefined`. */
export async function request<T, M = undefined>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T, M>> {
  const response = await execute(path, options);
  if (response.status === 204) return { data: undefined as T };
  return (await response.json()) as ApiEnvelope<T, M>;
}

/** Igual que `request`, pero para respuestas binarias (PDF): un enlace directo no puede llevar `Authorization`. */
export async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  return (await execute(path, options)).blob();
}

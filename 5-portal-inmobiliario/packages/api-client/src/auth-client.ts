import type {
  AuthUserDto,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const currentUserUrl = "/api/auth/me";

/** Mensaje de la API (`{ message }`) si existe; si no, el de respaldo. */
async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" && body.message !== "" ? body.message : fallback;
  } catch {
    return fallback;
  }
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

/** Crea la cuenta e inicia sesión (la API fija la cookie httpOnly). */
export async function registerUser(input: RegisterInput): Promise<AuthUserDto> {
  const response = await postJson("/api/auth/register", input);
  if (!response.ok) {
    throw new ApiRequestError(
      await readErrorMessage(response, "No se pudo crear la cuenta"),
      response.status,
    );
  }
  return (await response.json()) as AuthUserDto;
}

/** Inicia sesión. El error conserva el mensaje de la API (credenciales, cuenta desactivada). */
export async function loginUser(input: LoginInput): Promise<AuthUserDto> {
  const response = await postJson("/api/auth/login", input);
  if (!response.ok) {
    throw new ApiRequestError(
      await readErrorMessage(response, "No se pudo iniciar sesión"),
      response.status,
    );
  }
  return (await response.json()) as AuthUserDto;
}

/** Actualiza el perfil propio. Los errores conservan el mensaje de la API (contraseña, email repetido). */
export async function updateProfile(input: UpdateProfileInput): Promise<AuthUserDto> {
  const response = await fetch(currentUserUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new ApiRequestError(
      await readErrorMessage(response, "No se pudo actualizar la cuenta"),
      response.status,
    );
  }
  return (await response.json()) as AuthUserDto;
}

export async function logoutUser(): Promise<void> {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) {
    throw new ApiRequestError("No se pudo cerrar la sesión", response.status);
  }
}

/** Usuario autenticado, o null si no hay sesión (un 401 es un estado normal, no un error). */
export async function fetchCurrentUser(url: string = currentUserUrl): Promise<AuthUserDto | null> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new ApiRequestError("No se pudo consultar la sesión", response.status);
  }
  return (await response.json()) as AuthUserDto;
}

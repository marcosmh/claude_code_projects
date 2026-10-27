import type { AuthSession, AuthUser } from "@/types/auth";
import { ApiError, refreshSession, request } from "./apiClient";
import { clearLoggedOutLocally, isLoggedOutLocally, markLoggedOutLocally } from "./sessionFlags";

/** Intenta recuperar la sesión con la cookie del refresh: usuario, o `null` si no hay sesión recuperable. */
async function restoreSession(): Promise<AuthUser | null> {
  try {
    return (await refreshSession()).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

const isRetryableLogoutError = (error: unknown) => error instanceof ApiError && (error.status === 0 || error.status >= 500);

export const authService = {
  /** Inicia sesión: el servidor fija las cookies httpOnly (access y refresh); aquí solo llega el usuario. */
  async login(email: string, password: string): Promise<AuthUser> {
    const { user } = (await request<AuthSession>("/auth/login", { method: "POST", body: { email, password } })).data;
    clearLoggedOutLocally();
    return user;
  },

  /**
   * Avisa al backend, que revoca la sesión y borra las cookies. Ante un fallo de red o 5xx reintenta una vez; si el
   * servidor sigue sin revocarla deja la marca local que impide restaurarla con la cookie viva y propaga el error.
   */
  async logout(): Promise<void> {
    try {
      try {
        await request<void>("/auth/logout", { method: "POST" });
      } catch (error) {
        if (!isRetryableLogoutError(error)) throw error;
        await request<void>("/auth/logout", { method: "POST" });
      }
      clearLoggedOutLocally();
    } catch (error) {
      markLoggedOutLocally();
      throw error;
    }
  },

  /**
   * El backend invalida el access token actual con este cambio, así que se pide uno nuevo con la cookie de este
   * dispositivo. Si esa renovación falla la contraseña ya cambió: no se propaga el error; sin cookies válidas, la
   * siguiente petición lleva al inicio de sesión.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const send = () => request<void>("/auth/password", { method: "POST", body: { currentPassword, newPassword } });
    try {
      await send();
    } catch (error) {
      // /auth/* no se renueva solo: un 401 aquí es un access token caducado (una contraseña errónea es 422).
      if (!(error instanceof ApiError && error.status === 401) || !(await restoreSession())) throw error;
      await send();
    }
    try {
      await refreshSession();
    } catch {
      // La contraseña ya cambió: sin sesión renovada, la siguiente petición lleva al inicio de sesión.
    }
  },

  /**
   * Usuario de la sesión actual, o `null` si no hay sesión (no es un error: es el estado "sin iniciar").
   * Si el access token (cookie) falta o caducó, la sesión se recupera por el refresh antes de darla por perdida.
   */
  async me(signal?: AbortSignal): Promise<AuthUser | null> {
    if (isLoggedOutLocally()) return null;
    try {
      return (await request<AuthUser>("/auth/me", { signal })).data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return restoreSession();
      throw error;
    }
  },
};

import type { AuthUser } from "@/types/auth";
import { ApiError, refreshSession, request } from "./apiClient";
import {
  clearAccessToken,
  clearLoggedOutLocally,
  getAccessToken,
  isLoggedOutLocally,
  markLoggedOutLocally,
  setAccessToken,
} from "./tokenStorage";

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
  /** Inicia sesión y guarda el access token; el refresh llega en una cookie httpOnly. */
  async login(email: string, password: string): Promise<AuthUser> {
    const { token, user } = (await request<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body: { email, password } })).data;
    setAccessToken(token);
    clearLoggedOutLocally();
    return user;
  },

  /**
   * Avisa al backend y borra el access token siempre. Ante un fallo de red o 5xx reintenta una vez; si el servidor
   * sigue sin revocar la sesión deja la marca local que impide restaurarla con la cookie viva y propaga el error.
   */
  async logout(): Promise<void> {
    try {
      try {
        await request<void>("/auth/logout", { method: "POST" });
      } catch (error) {
        if (!isRetryableLogoutError(error)) throw error;
        // Se borra ya, no tras el reintento: si la página se descarga mientras espera (p. ej. navega a /login), el
        // token no puede quedarse guardado.
        clearAccessToken();
        await request<void>("/auth/logout", { method: "POST" });
      }
      clearLoggedOutLocally();
    } catch (error) {
      markLoggedOutLocally();
      throw error;
    } finally {
      clearAccessToken();
    }
  },

  /**
   * El backend invalida el access token actual con este cambio, así que se pide uno nuevo con la cookie de este
   * dispositivo. Si esa renovación falla la contraseña ya cambió: no se propaga el error; sin token, la siguiente
   * petición lleva al inicio de sesión.
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
      clearAccessToken();
    }
  },

  /**
   * Usuario de la sesión actual, o `null` si no hay sesión (no es un error: es el estado "sin iniciar").
   * Sin token o con uno caducado, la sesión se recupera por el refresh antes de darla por perdida.
   */
  async me(signal?: AbortSignal): Promise<AuthUser | null> {
    if (!getAccessToken()) return isLoggedOutLocally() ? null : restoreSession();
    try {
      return (await request<AuthUser>("/auth/me", { signal })).data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return restoreSession();
      throw error;
    }
  },
};

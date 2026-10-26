import type { AuthUser } from "@/types/auth";
import { ApiError, refreshSession, request } from "./apiClient";
import { clearAccessToken, getAccessToken, setAccessToken } from "./tokenStorage";

/** Intenta recuperar la sesión con la cookie del refresh: usuario, o `null` si no hay sesión recuperable. */
async function restoreSession(): Promise<AuthUser | null> {
  try {
    return (await refreshSession()).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export const authService = {
  /** Inicia sesión y guarda el access token; el refresh llega en una cookie httpOnly. */
  async login(email: string, password: string): Promise<AuthUser> {
    const { token, user } = (await request<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body: { email, password } })).data;
    setAccessToken(token);
    return user;
  },

  /** Avisa al backend y borra el access token aunque la llamada falle (el error se propaga después). */
  async logout(): Promise<void> {
    try {
      await request<void>("/auth/logout", { method: "POST" });
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
    if (!getAccessToken()) return restoreSession();
    try {
      return (await request<AuthUser>("/auth/me", { signal })).data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return restoreSession();
      throw error;
    }
  },
};

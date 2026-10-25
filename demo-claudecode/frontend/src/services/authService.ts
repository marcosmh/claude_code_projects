import type { AuthUser } from "@/types/auth";
import { ApiError, request } from "./apiClient";

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    return (await request<AuthUser>("/auth/login", { method: "POST", body: { email, password } })).data;
  },

  async logout(): Promise<void> {
    await request<void>("/auth/logout", { method: "POST" });
  },

  /** Usuario de la sesión actual, o `null` si no hay sesión (no es un error: es el estado "sin iniciar"). */
  async me(signal?: AbortSignal): Promise<AuthUser | null> {
    try {
      return (await request<AuthUser>("/auth/me", { signal })).data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
};

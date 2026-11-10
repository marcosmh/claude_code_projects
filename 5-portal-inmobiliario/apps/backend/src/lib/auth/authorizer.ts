import type { NextRequest } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { hasRole, type AuthUserDto, type UserRole } from "@portal/shared-types";
import { verifySessionToken } from "./session";
import { readSessionToken } from "./session-cookie";

type CurrentUserSource = {
  getCurrentUser(userId: string): Promise<AuthUserDto>;
};

/**
 * Decide quién hace la solicitud y si tiene permiso. Es la única barrera de autorización:
 * el frontend solo mejora la experiencia, cada Route Handler protegido debe pasar por aquí.
 */
export function createAuthorizer(authService: CurrentUserSource) {
  return {
    /** Usuario de la sesión. 401 si falta la cookie, es inválida, expiró o la cuenta ya no está activa. */
    async authenticate(request: NextRequest): Promise<AuthUserDto> {
      const token = readSessionToken(request);
      const userId = token ? await verifySessionToken(token) : null;
      if (userId === null) throw new UnauthorizedError("No has iniciado sesión");
      // El rol y el estado se leen de la base en cada solicitud, nunca del token.
      return authService.getCurrentUser(userId);
    },

    /** Usuario autenticado con al menos el rol pedido. 401 sin sesión; 403 si el rol no alcanza. */
    async requireRole(request: NextRequest, requiredRole: UserRole): Promise<AuthUserDto> {
      const user = await this.authenticate(request);
      if (!hasRole(user.role, requiredRole)) {
        throw new ForbiddenError("No tienes permiso para realizar esta acción");
      }
      return user;
    },
  };
}

export type Authorizer = ReturnType<typeof createAuthorizer>;

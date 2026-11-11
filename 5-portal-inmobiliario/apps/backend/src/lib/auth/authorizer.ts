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

    /**
     * Usuario de la sesión, o null si no hay una sesión válida. Para endpoints públicos que
     * enriquecen la solicitud cuando la persona ha iniciado sesión (p. ej. las consultas).
     * Solo absorbe el 401; cualquier otro fallo (base caída…) se propaga.
     */
    async authenticateOptional(request: NextRequest): Promise<AuthUserDto | null> {
      try {
        return await this.authenticate(request);
      } catch (error) {
        if (error instanceof UnauthorizedError) return null;
        throw error;
      }
    },

    /**
     * Usuario autenticado con al menos el rol pedido (o exactamente ese rol con `exact`, para
     * recursos de usuario final que un ADMIN no usa). 401 sin sesión; 403 si el rol no alcanza.
     */
    async requireRole(
      request: NextRequest,
      requiredRole: UserRole,
      options: { exact?: boolean } = {},
    ): Promise<AuthUserDto> {
      const user = await this.authenticate(request);
      const allowed = options.exact ? user.role === requiredRole : hasRole(user.role, requiredRole);
      if (!allowed) {
        throw new ForbiddenError("No tienes permiso para realizar esta acción");
      }
      return user;
    },
  };
}

export type Authorizer = ReturnType<typeof createAuthorizer>;

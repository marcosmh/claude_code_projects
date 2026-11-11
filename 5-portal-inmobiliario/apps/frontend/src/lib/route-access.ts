import { hasRole, type UserRole } from "@portal/shared-types";

export type RouteAccessRule = {
  prefix: string;
  role: UserRole;
  /** Si es false, solo ese rol exacto entra (un ADMIN no usa las páginas de usuario final). */
  allowHigherRoles: boolean;
};

/**
 * Páginas que exigen sesión y un rol mínimo. El matcher de `src/proxy.ts` debe listar los mismos
 * prefijos (Next exige que sea una constante); una prueba comprueba que coinciden.
 */
export const protectedRoutes: readonly RouteAccessRule[] = [
  { prefix: "/account", role: "USER", allowHigherRoles: false },
  { prefix: "/admin", role: "ADMIN", allowHigherRoles: true },
];

/** Regla de acceso de la ruta, o null si es pública. Coincide con el prefijo y sus subrutas. */
export function findRouteRule(pathname: string): RouteAccessRule | null {
  return (
    protectedRoutes.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ?? null
  );
}

/** Rol necesario para abrir la ruta, o null si es pública. */
export function findRequiredRole(pathname: string): UserRole | null {
  return findRouteRule(pathname)?.role ?? null;
}

/** true si el rol de la persona puede abrir una ruta con esa regla. */
export function canAccessRoute(userRole: UserRole, rule: RouteAccessRule): boolean {
  return rule.allowHigherRoles ? hasRole(userRole, rule.role) : userRole === rule.role;
}

/**
 * Ruta interna segura para volver tras iniciar sesión. Solo acepta rutas relativas del propio
 * sitio: rechaza URLs absolutas y `//host`, que serían una redirección abierta.
 */
export function sanitizeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}

/** Ruta de login que recuerda a dónde volver. */
export function buildLoginPath(nextPath?: string): string {
  const safeNextPath = sanitizeNextPath(nextPath);
  return safeNextPath === "/" ? "/login" : `/login?next=${encodeURIComponent(safeNextPath)}`;
}

/**
 * A dónde ir tras iniciar sesión: un ADMIN sin ruta pedida entra al panel de administración;
 * en cualquier otro caso se respeta la ruta pedida (saneada) o la página principal.
 */
export function resolvePostLoginPath(role: UserRole, requestedPath: string | null): string {
  const safePath = sanitizeNextPath(requestedPath);
  return role === "ADMIN" && safePath === "/" ? "/admin" : safePath;
}

/** Ruta de entrada al abrir `/`: el ADMIN va a su panel y cualquier otra persona al portal. */
export function resolveEntryPath(role: UserRole | null): string {
  return role === "ADMIN" ? "/admin" : "/portal";
}

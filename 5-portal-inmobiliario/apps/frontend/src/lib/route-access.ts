import type { UserRole } from "@portal/shared-types";

export type RouteAccessRule = { prefix: string; role: UserRole };

/**
 * Páginas que exigen sesión y un rol mínimo. El matcher de `src/proxy.ts` debe listar los mismos
 * prefijos (Next exige que sea una constante); una prueba comprueba que coinciden.
 */
export const protectedRoutes: readonly RouteAccessRule[] = [
  { prefix: "/account", role: "USER" },
  { prefix: "/admin", role: "ADMIN" },
];

/** Rol mínimo para abrir la ruta, o null si es pública. Coincide con el prefijo y sus subrutas. */
export function findRequiredRole(pathname: string): UserRole | null {
  const rule = protectedRoutes.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return rule?.role ?? null;
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

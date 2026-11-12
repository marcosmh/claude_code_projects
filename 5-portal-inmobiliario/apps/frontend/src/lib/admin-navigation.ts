export type AdminIconName =
  "dashboard" | "users" | "properties" | "inquiries" | "reports" | "settings" | "audit";

export type AdminNavigationItem = {
  id: string;
  label: string;
  icon: AdminIconName;
  /** Ruta del módulo; null mientras no esté construido (se muestra deshabilitado). */
  href: string | null;
};

/**
 * Módulos del área de administración (spec §38). Cada módulo recibe su `href` cuando se
 * implementa: propiedades (Paso 24), usuarios (Paso 29) y consultas (Paso 30).
 */
export const adminNavigation: readonly AdminNavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/admin" },
  { id: "users", label: "Administrar usuarios", icon: "users", href: "/admin/users" },
  {
    id: "properties",
    label: "Administrar propiedades",
    icon: "properties",
    href: "/admin/properties",
  },
  { id: "inquiries", label: "Administrar consultas", icon: "inquiries", href: "/admin/inquiries" },
  { id: "reports", label: "Reportes y estadísticas", icon: "reports", href: null },
  { id: "settings", label: "Configuración del sistema", icon: "settings", href: null },
  { id: "audit", label: "Auditoría y logs", icon: "audit", href: null },
];

/** El Dashboard solo está activo en /admin exacto; el resto de módulos también en sus subrutas. */
export function isAdminItemActive(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

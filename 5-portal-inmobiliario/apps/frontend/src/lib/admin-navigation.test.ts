import { describe, expect, it } from "vitest";
import { adminNavigation, isAdminItemActive } from "./admin-navigation";

describe("adminNavigation", () => {
  it("incluye los módulos pedidos, con el Dashboard primero y habilitados solo los módulos construidos", () => {
    expect(adminNavigation.map((item) => item.label)).toEqual([
      "Dashboard",
      "Administrar usuarios",
      "Administrar propiedades",
      "Administrar consultas",
      "Reportes y estadísticas",
      "Configuración del sistema",
      "Auditoría y logs",
    ]);
    expect(adminNavigation.filter((item) => item.href !== null).map((item) => item.href)).toEqual([
      "/admin",
      "/admin/users",
      "/admin/properties",
      "/admin/inquiries",
      "/admin/reports",
      "/admin/settings",
      "/admin/audit",
    ]);
  });

  it("todos los identificadores son únicos y ninguno apunta a páginas de usuario final", () => {
    expect(new Set(adminNavigation.map((item) => item.id)).size).toBe(adminNavigation.length);
    for (const { href } of adminNavigation) {
      expect(href === null || href.startsWith("/admin")).toBe(true);
    }
  });
});

describe("isAdminItemActive", () => {
  it("el Dashboard solo está activo en /admin exacto", () => {
    expect(isAdminItemActive("/admin", "/admin")).toBe(true);
    expect(isAdminItemActive("/admin/properties", "/admin")).toBe(false);
  });

  it("los demás módulos también están activos en sus subrutas", () => {
    expect(isAdminItemActive("/admin/properties", "/admin/properties")).toBe(true);
    expect(isAdminItemActive("/admin/properties/p1/edit", "/admin/properties")).toBe(true);
    expect(isAdminItemActive("/admin/propertiesX", "/admin/properties")).toBe(false);
  });
});

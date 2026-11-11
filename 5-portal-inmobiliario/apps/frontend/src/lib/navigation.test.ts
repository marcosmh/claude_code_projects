import { describe, expect, it } from "vitest";
import {
  headerMenuItems,
  isNavigationItemActive,
  loginNavigationItem,
  publicNavigationItems,
} from "./navigation";

describe("publicNavigationItems", () => {
  it("contiene los enlaces públicos iniciales en orden", () => {
    expect(publicNavigationItems.map((item) => item.label)).toEqual([
      "Inicio",
      "Propiedades",
      "Comprar",
      "Arrendar",
      "Ingresar",
    ]);
  });
});

describe("headerMenuItems", () => {
  it("excluye el botón de ingreso, que el header muestra aparte", () => {
    expect(headerMenuItems.map((item) => item.label)).toEqual([
      "Inicio",
      "Propiedades",
      "Comprar",
      "Arrendar",
    ]);
    expect(loginNavigationItem).toEqual({ label: "Ingresar", href: "/login" });
  });
});

describe("isNavigationItemActive", () => {
  it("Inicio solo está activo en la raíz", () => {
    expect(isNavigationItemActive("/portal", "/portal")).toBe(true);
    expect(isNavigationItemActive("/properties", "/portal")).toBe(false);
  });

  it("Propiedades está activo en el catálogo y su detalle", () => {
    expect(isNavigationItemActive("/properties", "/properties")).toBe(true);
    expect(isNavigationItemActive("/properties/12", "/properties")).toBe(true);
    expect(isNavigationItemActive("/propertiesx", "/properties")).toBe(false);
  });

  it("enlaces con query string nunca están activos", () => {
    expect(isNavigationItemActive("/properties", "/properties?operation=SALE")).toBe(false);
  });
});

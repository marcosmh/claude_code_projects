import { describe, expect, it } from "vitest";
import { isNavigationItemActive, publicNavigationItems } from "./navigation";

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

describe("isNavigationItemActive", () => {
  it("Inicio solo está activo en la raíz", () => {
    expect(isNavigationItemActive("/", "/")).toBe(true);
    expect(isNavigationItemActive("/properties", "/")).toBe(false);
  });

  it("Propiedades está activo en el catálogo y su detalle", () => {
    expect(isNavigationItemActive("/properties", "/properties")).toBe(true);
    expect(isNavigationItemActive("/properties/12", "/properties")).toBe(true);
    expect(isNavigationItemActive("/propertiesx", "/properties")).toBe(false);
  });

  it("enlaces con query string nunca están activos", () => {
    expect(
      isNavigationItemActive("/properties", "/properties?operation=SALE"),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { buildCatalogHref, parseCatalogParams } from "./catalog-params";

describe("parseCatalogParams", () => {
  it("usa la página 1 por defecto", () => {
    expect(parseCatalogParams(new URLSearchParams())).toEqual({ page: 1 });
  });
  it("lee página y operación válidas", () => {
    expect(parseCatalogParams(new URLSearchParams("page=3&operation=RENT"))).toEqual({
      page: 3,
      operation: "RENT",
    });
  });
  it("lee el texto de búsqueda recortado", () => {
    expect(parseCatalogParams(new URLSearchParams("search=%20providencia%20"))).toEqual({
      page: 1,
      search: "providencia",
    });
    expect(parseCatalogParams(new URLSearchParams("search=%20%20"))).toEqual({ page: 1 });
  });
  it("ignora valores inválidos", () => {
    expect(parseCatalogParams(new URLSearchParams("page=-2&operation=foo"))).toEqual({ page: 1 });
    expect(parseCatalogParams(new URLSearchParams("page=abc"))).toEqual({ page: 1 });
    expect(parseCatalogParams(new URLSearchParams("page=1.5"))).toEqual({ page: 1 });
  });
});

describe("buildCatalogHref", () => {
  it("omite parámetros por defecto", () => {
    expect(buildCatalogHref({ page: 1 })).toBe("/properties");
  });
  it("conserva la operación al cambiar de página", () => {
    expect(buildCatalogHref({ page: 2, operation: "SALE" })).toBe(
      "/properties?operation=SALE&page=2",
    );
  });
  it("incluye la búsqueda codificada", () => {
    expect(buildCatalogHref({ page: 2, search: "Mérida centro" })).toBe(
      "/properties?search=M%C3%A9rida+centro&page=2",
    );
  });

  it("serializa todos los filtros y la página", () => {
    expect(
      buildCatalogHref({
        page: 3,
        operation: "SALE",
        type: "HOUSE",
        minPrice: 100,
        bedrooms: 3,
        commune: "las-condes",
      }),
    ).toBe(
      "/properties?operation=SALE&type=HOUSE&minPrice=100&bedrooms=3&commune=las-condes&page=3",
    );
  });
});

describe("parseCatalogParams con filtros", () => {
  it("lee tipo, números y ubicación", () => {
    expect(
      parseCatalogParams(
        new URLSearchParams(
          "type=LAND&minPrice=1000&maxPrice=2500.5&bedrooms=3&bathrooms=2&minUsableArea=80&commune=Álamos&city=Mérida&region=Yucatán",
        ),
      ),
    ).toEqual({
      page: 1,
      type: "LAND",
      minPrice: 1000,
      maxPrice: 2500.5,
      bedrooms: 3,
      bathrooms: 2,
      minUsableArea: 80,
      commune: "Álamos",
      city: "Mérida",
      region: "Yucatán",
    });
  });

  it("ignora tipo inválido y números negativos o no numéricos", () => {
    expect(
      parseCatalogParams(new URLSearchParams("type=CASTLE&minPrice=-5&bedrooms=abc&city=%20%20")),
    ).toEqual({ page: 1 });
  });
});

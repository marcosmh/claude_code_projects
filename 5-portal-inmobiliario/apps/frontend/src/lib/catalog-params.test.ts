import { describe, expect, it } from "vitest";
import { buildCatalogHref, parseCatalogParams } from "./catalog-params";

describe("parseCatalogParams", () => {
  it("usa la página 1 por defecto", () => {
    expect(parseCatalogParams(new URLSearchParams())).toEqual({ page: 1 });
  });
  it("lee página y operación válidas", () => {
    expect(parseCatalogParams(new URLSearchParams("page=3&operation=RENT"))).toEqual({
      page: 3,
      operation: ["RENT"],
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
    expect(buildCatalogHref({ page: 2, operation: ["SALE"] })).toBe(
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
        operation: ["SALE"],
        type: ["HOUSE"],
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
      type: ["LAND"],
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

describe("orden en la URL", () => {
  it("lee un orden válido y omite el predeterminado o inválido", () => {
    expect(parseCatalogParams(new URLSearchParams("sort=area_desc"))).toEqual({
      page: 1,
      sort: "area_desc",
    });
    expect(parseCatalogParams(new URLSearchParams("sort=newest"))).toEqual({ page: 1 });
    expect(parseCatalogParams(new URLSearchParams("sort=random"))).toEqual({ page: 1 });
  });

  it("conserva el orden al construir la URL", () => {
    expect(buildCatalogHref({ page: 2, sort: "price_asc" })).toBe(
      "/properties?sort=price_asc&page=2",
    );
    expect(buildCatalogHref({ page: 1, sort: "newest" })).toBe("/properties");
  });
});

describe("selección múltiple en la URL", () => {
  it("lee varias operaciones y tipos en orden canónico, sin duplicados ni valores desconocidos", () => {
    expect(
      parseCatalogParams(
        new URLSearchParams("operation=RENT,SALE,SALE,LEASE&type=LAND, HOUSE,CASTLE"),
      ),
    ).toEqual({ page: 1, operation: ["SALE", "RENT"], type: ["HOUSE", "LAND"] });
  });

  it("ignora listas sin valores válidos", () => {
    expect(parseCatalogParams(new URLSearchParams("operation=foo&type=,"))).toEqual({ page: 1 });
  });

  it("serializa las listas separadas por comas y omite las vacías", () => {
    expect(
      buildCatalogHref({ page: 1, operation: ["SALE", "RENT"], type: ["HOUSE", "LAND"] }),
    ).toBe("/properties?operation=SALE%2CRENT&type=HOUSE%2CLAND");
    expect(buildCatalogHref({ page: 1, operation: [], type: [] })).toBe("/properties");
  });
});

describe("estado y fecha de publicación (Extra N)", () => {
  it("lee estados válidos y fechas, e ignora lo inválido", () => {
    expect(
      parseCatalogParams(
        new URLSearchParams(
          "availability=SOLD,foo,RENTED&publishedFrom=2026-01-01&publishedTo=31-12-2026",
        ),
      ),
    ).toEqual({ page: 1, availability: ["SOLD", "RENTED"], publishedFrom: "2026-01-01" });
    expect(parseCatalogParams(new URLSearchParams("publishedFrom=2026-13-45"))).toEqual({
      page: 1,
    });
  });

  it("los serializa en la URL", () => {
    expect(
      buildCatalogHref({
        page: 1,
        availability: ["SOLD"],
        publishedFrom: "2026-01-01",
        publishedTo: "2026-03-31",
      }),
    ).toBe("/properties?availability=SOLD&publishedFrom=2026-01-01&publishedTo=2026-03-31");
  });
});

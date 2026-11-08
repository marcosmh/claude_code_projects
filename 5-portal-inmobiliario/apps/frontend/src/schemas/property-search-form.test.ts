import { describe, expect, it } from "vitest";
import { buildCatalogSearchHref, propertySearchFormSchema } from "./property-search-form";

describe("buildCatalogSearchHref", () => {
  it("apunta al catálogo sin parámetros cuando todo está vacío", () => {
    expect(buildCatalogSearchHref({ search: "", operation: "ALL" })).toBe("/properties");
  });

  it("incluye texto y operación", () => {
    expect(buildCatalogSearchHref({ search: "polanco", operation: "SALE" })).toBe(
      "/properties?search=polanco&operation=SALE",
    );
  });

  it("recorta espacios y codifica caracteres especiales", () => {
    expect(buildCatalogSearchHref({ search: "  San Pedro & Valle ", operation: "ALL" })).toBe(
      "/properties?search=San+Pedro+%26+Valle",
    );
  });
});

describe("propertySearchFormSchema", () => {
  it("rechaza textos de más de 100 caracteres", () => {
    expect(
      propertySearchFormSchema.safeParse({ search: "a".repeat(101), operation: "ALL" }).success,
    ).toBe(false);
  });

  it("rechaza operaciones desconocidas", () => {
    expect(propertySearchFormSchema.safeParse({ search: "", operation: "X" }).success).toBe(false);
  });
});

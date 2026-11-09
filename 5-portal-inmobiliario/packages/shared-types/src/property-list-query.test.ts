import { describe, expect, it } from "vitest";
import { propertyListQuerySchema } from "./property-list-query";

describe("propertyListQuerySchema", () => {
  it("aplica valores por defecto", () => {
    expect(propertyListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 12, sort: "newest" });
  });

  it("convierte strings de la URL a números", () => {
    expect(propertyListQuerySchema.parse({ page: "2", pageSize: "24" })).toEqual({
      page: 2,
      pageSize: 24,
      sort: "newest",
    });
  });

  it("normaliza search: recorta y trata vacío como ausente", () => {
    expect(propertyListQuerySchema.parse({ search: "  Querétaro " }).search).toBe("Querétaro");
    expect(propertyListQuerySchema.parse({ search: "   " }).search).toBeUndefined();
    expect(propertyListQuerySchema.parse({}).search).toBeUndefined();
  });

  it("rechaza search de más de 100 caracteres", () => {
    expect(propertyListQuerySchema.safeParse({ search: "a".repeat(101) }).success).toBe(false);
  });

  it("acepta operation y featured", () => {
    expect(
      propertyListQuerySchema.parse({ operation: "SALE", featured: "true" }),
    ).toMatchObject({ operation: ["SALE"], featured: true });
    expect(propertyListQuerySchema.parse({ featured: "false" }).featured).toBe(false);
  });

  it.each([
    { operation: "sale" },
    { operation: "OTHER" },
    { featured: "yes" },
  ])("rechaza filtro inválido %j", (input) => {
    expect(propertyListQuerySchema.safeParse(input).success).toBe(false);
  });

  it.each([
    { page: "0" },
    { page: "-1" },
    { page: "abc" },
    { page: "1.5" },
    { pageSize: "0" },
    { pageSize: "51" },
  ])("rechaza %j", (input) => {
    expect(propertyListQuerySchema.safeParse(input).success).toBe(false);
  });

  it("convierte los filtros numéricos y de texto", () => {
    expect(
      propertyListQuerySchema.parse({
        type: "HOUSE",
        minPrice: "1000",
        maxPrice: "5000",
        bedrooms: "3",
        bathrooms: "2",
        minUsableArea: "80.5",
        commune: " Álamos ",
        city: "",
      }),
    ).toMatchObject({
      type: ["HOUSE"],
      minPrice: 1000,
      maxPrice: 5000,
      bedrooms: 3,
      bathrooms: 2,
      minUsableArea: 80.5,
      commune: "Álamos",
      city: undefined,
    });
  });

  it("trata filtros numéricos vacíos como ausentes", () => {
    const parsed = propertyListQuerySchema.parse({ minPrice: "", bedrooms: "" });
    expect(parsed.minPrice).toBeUndefined();
    expect(parsed.bedrooms).toBeUndefined();
  });

  it("rechaza tipo inválido, números negativos o no numéricos y rangos invertidos", () => {
    expect(propertyListQuerySchema.safeParse({ type: "CASTLE" }).success).toBe(false);
    expect(propertyListQuerySchema.safeParse({ minPrice: "-1" }).success).toBe(false);
    expect(propertyListQuerySchema.safeParse({ bedrooms: "abc" }).success).toBe(false);
    expect(propertyListQuerySchema.safeParse({ bedrooms: "1.5" }).success).toBe(false);
    expect(propertyListQuerySchema.safeParse({ minPrice: "10", maxPrice: "5" }).success).toBe(
      false,
    );
  });

  it("valida el orden", () => {
    expect(propertyListQuerySchema.parse({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(propertyListQuerySchema.safeParse({ sort: "random" }).success).toBe(false);
  });

  it("acepta uno o varios valores separados por comas en operation y type", () => {
    expect(propertyListQuerySchema.parse({ operation: "SALE" }).operation).toEqual(["SALE"]);
    const parsed = propertyListQuerySchema.parse({
      operation: "SALE, RENT,SALE",
      type: "HOUSE,APARTMENT",
    });
    expect(parsed.operation).toEqual(["SALE", "RENT"]);
    expect(parsed.type).toEqual(["HOUSE", "APARTMENT"]);
  });

  it("trata operation y type vacíos como sin filtro", () => {
    const parsed = propertyListQuerySchema.parse({ operation: "", type: " , " });
    expect(parsed.operation).toBeUndefined();
    expect(parsed.type).toBeUndefined();
  });

  it("rechaza valores desconocidos dentro de la lista", () => {
    expect(propertyListQuerySchema.safeParse({ operation: "SALE,LEASE" }).success).toBe(false);
    expect(propertyListQuerySchema.safeParse({ type: "HOUSE,CASTLE" }).success).toBe(false);
  });
});


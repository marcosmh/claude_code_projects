import { describe, expect, it } from "vitest";
import { propertyListQuerySchema } from "./property-list-query";

describe("propertyListQuerySchema", () => {
  it("aplica valores por defecto", () => {
    expect(propertyListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 12 });
  });

  it("convierte strings de la URL a números", () => {
    expect(propertyListQuerySchema.parse({ page: "2", pageSize: "24" })).toEqual({
      page: 2,
      pageSize: 24,
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
    ).toMatchObject({ operation: "SALE", featured: true });
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
});

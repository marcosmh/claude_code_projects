import { describe, expect, it } from "vitest";
import { adminPropertyListQuerySchema, propertyInputSchema } from "./property-admin";

const valid = {
  title: "Casa en Coyoacán",
  description: "Casa amplia con jardín y cochera.",
  operation: "SALE",
  type: "HOUSE",
  price: 4500000,
  address: "Calle Falsa 123",
  commune: "Coyoacán",
  city: "Ciudad de México",
  region: "Ciudad de México",
};

describe("propertyInputSchema", () => {
  it("aplica valores por defecto: MXN, no publicada, no destacada y opcionales en null", () => {
    expect(propertyInputSchema.parse(valid)).toMatchObject({
      currency: "MXN",
      isPublished: false,
      isFeatured: false,
      usableArea: null,
      totalArea: null,
      bedrooms: null,
      bathrooms: null,
      parkingSpots: null,
      age: null,
    });
  });

  it("recorta textos y acepta null en opcionales", () => {
    const parsed = propertyInputSchema.parse({
      ...valid,
      title: "  Casa en Coyoacán ",
      bedrooms: null,
    });
    expect(parsed.title).toBe("Casa en Coyoacán");
    expect(parsed.bedrooms).toBeNull();
  });

  it("ignora latitud y longitud", () => {
    const parsed = propertyInputSchema.parse({ ...valid, latitude: 1, longitude: 2 });
    expect(parsed).not.toHaveProperty("latitude");
    expect(parsed).not.toHaveProperty("longitude");
  });

  it.each([
    ["título corto", { title: "abc" }],
    ["descripción vacía", { description: "  " }],
    ["operación inválida", { operation: "SWAP" }],
    ["tipo inválido", { type: "CASTLE" }],
    ["precio cero", { price: 0 }],
    ["precio como texto", { price: "100" }],
    ["moneda inválida", { currency: "EUR" }],
    ["dormitorios decimales", { bedrooms: 1.5 }],
    ["baños negativos", { bathrooms: -1 }],
    ["dirección vacía", { address: "" }],
    ["ciudad ausente", { city: undefined }],
  ])("rechaza %s", (_label, override) => {
    expect(propertyInputSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it("rechaza una superficie útil mayor que la total", () => {
    const result = propertyInputSchema.safeParse({ ...valid, usableArea: 200, totalArea: 100 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["usableArea"]);
  });
});

describe("adminPropertyListQuerySchema", () => {
  it("usa página 1, 10 por página y estado all por defecto", () => {
    expect(adminPropertyListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 10,
      status: "all",
    });
  });

  it("recorta la búsqueda, vacía equivale a ninguna, y valida el estado", () => {
    expect(adminPropertyListQuerySchema.parse({ search: " casa " }).search).toBe("casa");
    expect(adminPropertyListQuerySchema.parse({ search: "  " }).search).toBeUndefined();
    expect(adminPropertyListQuerySchema.safeParse({ status: "x" }).success).toBe(false);
    expect(adminPropertyListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });
});

describe("propertyInputSchema: estado de la propiedad (Extra N)", () => {
  it("usa AVAILABLE por defecto y acepta SOLD y RENTED", () => {
    expect(propertyInputSchema.parse(valid).availability).toBe("AVAILABLE");
    expect(propertyInputSchema.parse({ ...valid, availability: "SOLD" }).availability).toBe("SOLD");
    expect(propertyInputSchema.parse({ ...valid, availability: "RENTED" }).availability).toBe(
      "RENTED",
    );
  });

  it("rechaza un estado desconocido", () => {
    expect(propertyInputSchema.safeParse({ ...valid, availability: "GONE" }).success).toBe(false);
  });
});

describe("adminPropertyListQuerySchema: filtros avanzados (Extra O)", () => {
  it("acepta operación, tipo, estado, precio y fechas", () => {
    const result = adminPropertyListQuerySchema.parse({
      operation: "SALE,RENT",
      type: "HOUSE",
      availability: "SOLD",
      minPrice: "1000",
      maxPrice: "5000",
      publishedFrom: "2026-01-01",
      publishedTo: "2026-02-01",
    });
    expect(result).toMatchObject({
      operation: ["SALE", "RENT"],
      type: ["HOUSE"],
      availability: ["SOLD"],
      minPrice: 1000,
      maxPrice: 5000,
      publishedFrom: "2026-01-01",
      publishedTo: "2026-02-01",
    });
  });

  it("rechaza rangos invertidos y valores desconocidos", () => {
    expect(adminPropertyListQuerySchema.safeParse({ minPrice: "10", maxPrice: "5" }).success).toBe(
      false,
    );
    expect(
      adminPropertyListQuerySchema.safeParse({
        publishedFrom: "2026-05-01",
        publishedTo: "2026-04-01",
      }).success,
    ).toBe(false);
    expect(adminPropertyListQuerySchema.safeParse({ availability: "GONE" }).success).toBe(false);
  });
});

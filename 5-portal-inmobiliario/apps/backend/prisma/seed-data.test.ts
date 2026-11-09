import { describe, expect, it } from "vitest";
import { registerInputSchema } from "@portal/shared-types";
import { seedFeatures, seedProperties, seedUsers } from "./seed-data";

describe("datos del seed", () => {
  it("incluye propiedades de venta y de arriendo", () => {
    const operations = new Set(seedProperties.map((property) => property.operation));
    expect(operations).toEqual(new Set(["SALE", "RENT"]));
  });

  it("incluye casas, departamentos, terrenos y oficinas", () => {
    const types = new Set(seedProperties.map((property) => property.type));
    for (const requiredType of ["HOUSE", "APARTMENT", "LAND", "OFFICE"]) {
      expect(types.has(requiredType as never)).toBe(true);
    }
  });

  it("cubre varias comunas y ciudades con distintos precios", () => {
    const communes = new Set(seedProperties.map((property) => property.commune));
    const cities = new Set(seedProperties.map((property) => property.city));
    const prices = seedProperties.map((property) => property.price);
    expect(communes.size).toBeGreaterThanOrEqual(10);
    expect(cities.size).toBeGreaterThanOrEqual(6);
    expect(new Set(prices).size).toBeGreaterThan(10);
  });

  it("tiene propiedades destacadas y borradores sin publicar", () => {
    expect(seedProperties.some((property) => property.isFeatured)).toBe(true);
    expect(seedProperties.some((property) => !property.isPublished)).toBe(true);
    expect(
      seedProperties
        .filter((property) => property.isFeatured)
        .every((property) => property.isPublished),
    ).toBe(true);
  });

  it("no repite títulos", () => {
    const titles = seedProperties.map((property) => property.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("usa solo características definidas y sin duplicar slugs", () => {
    const slugs = seedFeatures.map((feature) => feature.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const property of seedProperties) {
      for (const slug of property.featureSlugs) {
        expect(slugs).toContain(slug);
      }
    }
  });

  it("respeta las reglas del dominio por propiedad", () => {
    for (const property of seedProperties) {
      expect(property.price).toBeGreaterThan(0);
      if (property.usableArea !== undefined && property.totalArea !== undefined) {
        expect(property.usableArea).toBeLessThanOrEqual(property.totalArea);
      }
      if (property.type === "LAND") {
        expect(property.bedrooms).toBeUndefined();
        expect(property.totalArea).toBeDefined();
      }
    }
  });

  it("los arriendos tienen precios mensuales menores que las ventas de la misma moneda", () => {
    const maximumRentMxn = Math.max(
      ...seedProperties
        .filter((property) => property.operation === "RENT" && property.currency === "MXN")
        .map((property) => property.price),
    );
    const minimumSaleMxn = Math.min(
      ...seedProperties
        .filter((property) => property.operation === "SALE" && property.currency === "MXN")
        .map((property) => property.price),
    );
    expect(maximumRentMxn).toBeLessThan(minimumSaleMxn);
  });
});

describe("usuarios de ejemplo del seed", () => {
  it("incluye un administrador, un usuario activo y uno inactivo", () => {
    expect(seedUsers.some((user) => user.role === "ADMIN" && user.isActive)).toBe(true);
    expect(seedUsers.some((user) => user.role === "USER" && user.isActive)).toBe(true);
    expect(seedUsers.some((user) => !user.isActive)).toBe(true);
  });

  it("tiene emails únicos en minúsculas", () => {
    const emails = seedUsers.map((user) => user.email);
    expect(new Set(emails).size).toBe(emails.length);
    for (const email of emails) expect(email).toBe(email.toLowerCase());
  });

  it("sus credenciales cumplen las reglas de registro", () => {
    for (const user of seedUsers) {
      const result = registerInputSchema.safeParse({
        name: user.name,
        email: user.email,
        password: user.password,
      });
      expect(result.success).toBe(true);
    }
  });
});

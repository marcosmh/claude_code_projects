import { describe, expect, it } from "vitest";
import type { PropertyDetailDto } from "@portal/shared-types";
import { buildFallbackMetadata, buildPropertyMetadata, truncateText } from "./seo";

const property: PropertyDetailDto = {
  id: "p 1",
  title: "Casa en Coyoacán",
  operation: "SALE",
  type: "HOUSE",
  price: 4850000,
  currency: "MXN",
  availability: "AVAILABLE",
  usableArea: 120,
  bedrooms: 3,
  bathrooms: 2,
  commune: "Del Carmen",
  city: "CDMX",
  region: "CDMX",
  isFeatured: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  description: "Hermosa casa con jardín amplio y cocina integral. ".repeat(10),
  totalArea: 200,
  parkingSpots: 2,
  age: 5,
  address: "Calle 1",
  updatedAt: "2026-01-02T00:00:00.000Z",
  images: [
    { id: "i1", url: "https://res.cloudinary.com/demo/a.jpg", position: 0, isPrimary: false },
    { id: "i2", url: "https://res.cloudinary.com/demo/b.jpg", position: 1, isPrimary: true },
  ],
  features: [],
};

describe("truncateText", () => {
  it("no toca textos cortos y recorta en límite de palabra con «…»", () => {
    expect(truncateText("  hola   mundo ", 50)).toBe("hola mundo");
    const result = truncateText("uno dos tres cuatro cinco seis", 18);
    expect(result.length).toBeLessThanOrEqual(18);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("cuat ");
  });
});

describe("buildPropertyMetadata", () => {
  it("arma título, descripción de máximo 160 caracteres y Open Graph con la imagen principal", () => {
    const metadata = buildPropertyMetadata(property);
    expect(metadata.title).toBe("Casa en Coyoacán | Portal Inmobiliario");
    const description = metadata.description as string;
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toContain("Casa en venta en Del Carmen, CDMX");
    expect(description).toContain("$4,850,000");
    expect(metadata.openGraph).toMatchObject({
      title: "Casa en Coyoacán | Portal Inmobiliario",
      locale: "es_MX",
      url: "/properties/p%201",
      images: [{ url: "https://res.cloudinary.com/demo/b.jpg", alt: "Casa en Coyoacán" }],
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("usa la primera imagen si ninguna es principal y omite imagen si no hay", () => {
    const withoutPrimary = buildPropertyMetadata({
      ...property,
      images: [{ ...property.images[0], isPrimary: false }],
    });
    expect(withoutPrimary.openGraph).toMatchObject({
      images: [{ url: "https://res.cloudinary.com/demo/a.jpg" }],
    });

    const noImages = buildPropertyMetadata({ ...property, images: [] });
    expect(noImages.openGraph).not.toHaveProperty("images");
    expect(noImages.twitter).toMatchObject({ card: "summary" });
  });
});

describe("buildFallbackMetadata", () => {
  it("no se indexa", () => {
    const metadata = buildFallbackMetadata();
    expect(metadata.title).toBe("Propiedad no encontrada | Portal Inmobiliario");
    expect(metadata.robots).toEqual({ index: false });
  });
});

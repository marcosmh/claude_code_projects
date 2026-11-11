import { describe, expect, it } from "vitest";
import { emptyPropertyFormValues, propertyFormSchema, propertyToFormValues } from "./property-form";

const validValues = {
  ...emptyPropertyFormValues,
  title: "Casa en Coyoacán",
  description: "Casa amplia con jardín y cochera.",
  price: "4850000",
  address: "Calle Hidalgo 12",
  commune: "Coyoacán",
  city: "Ciudad de México",
  region: "CDMX",
};

describe("propertyFormSchema", () => {
  it("convierte el texto a números y deja vacíos los opcionales", () => {
    const result = propertyFormSchema.safeParse({
      ...validValues,
      bedrooms: "3",
      usableArea: "120.5",
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      price: 4850000,
      bedrooms: 3,
      usableArea: 120.5,
      totalArea: null,
      age: null,
      operation: "SALE",
      isPublished: false,
    });
  });

  it("exige título, precio y ubicación con los mensajes de la API", () => {
    const result = propertyFormSchema.safeParse(emptyPropertyFormValues);
    expect(result.success).toBe(false);
    // React Hook Form muestra el primer mensaje de cada campo.
    const messages: Record<string, string> = {};
    for (const issue of result.error!.issues) messages[issue.path.join(".")] ??= issue.message;
    expect(messages.title).toBe("El título es obligatorio");
    expect(messages.price).toBe("El precio es obligatorio");
    expect(messages.city).toBe("La ciudad es obligatoria");
  });

  it("rechaza precio negativo y enteros decimales", () => {
    const result = propertyFormSchema.safeParse({ ...validValues, price: "-5", bedrooms: "2.5" });
    const messages = result.error!.issues.map(
      (issue) => `${issue.path.join(".")}:${issue.message}`,
    );
    expect(messages).toContain("price:El precio debe ser mayor que cero");
    expect(messages).toContain("bedrooms:Debe ser un entero");
  });

  it("rechaza una superficie útil mayor que la total", () => {
    const result = propertyFormSchema.safeParse({
      ...validValues,
      usableArea: "300",
      totalArea: "200",
    });
    expect(
      result.error!.issues.map((issue) => `${issue.path.join(".")}:${issue.message}`),
    ).toContain("usableArea:La superficie útil no puede superar la total");
  });
});

describe("propertyToFormValues", () => {
  it("convierte la propiedad guardada en valores de texto", () => {
    const values = propertyToFormValues({
      id: "p1",
      title: "Casa",
      description: "Descripción larga",
      operation: "RENT",
      type: "APARTMENT",
      price: 15000,
      currency: "USD",
      usableArea: null,
      totalArea: 90,
      bedrooms: 2,
      bathrooms: null,
      parkingSpots: 1,
      age: 0,
      address: "Calle 1",
      commune: "Roma",
      city: "CDMX",
      region: "CDMX",
      isPublished: true,
      isFeatured: false,
      createdAt: "",
      updatedAt: "",
      images: [],
      features: [],
    });
    expect(values).toMatchObject({
      operation: "RENT",
      price: "15000",
      usableArea: "",
      totalArea: "90",
      age: "0",
      isPublished: true,
    });
  });
});

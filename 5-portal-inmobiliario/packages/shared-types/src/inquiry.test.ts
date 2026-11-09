import { describe, expect, it } from "vitest";
import { inquiryInputSchema } from "./inquiry";

const valid = {
  propertyId: "p1",
  name: "Ana Pérez",
  email: "ana@example.com",
  message: "Me interesa esta propiedad, ¿podemos agendar?",
};

describe("inquiryInputSchema", () => {
  it("acepta una consulta válida sin teléfono", () => {
    const parsed = inquiryInputSchema.parse(valid);
    expect(parsed.phone).toBeUndefined();
  });

  it("recorta espacios y trata el teléfono vacío como ausente", () => {
    const parsed = inquiryInputSchema.parse({ ...valid, name: "  Ana ", phone: "  " });
    expect(parsed.name).toBe("Ana");
    expect(parsed.phone).toBeUndefined();
  });

  it("acepta teléfonos con formato habitual", () => {
    expect(inquiryInputSchema.safeParse({ ...valid, phone: "+52 (55) 1234-5678" }).success).toBe(
      true,
    );
  });

  it.each([
    ["nombre corto", { name: "A" }],
    ["email inválido", { email: "no-es-email" }],
    ["teléfono inválido", { phone: "abc" }],
    ["mensaje corto", { message: "hola" }],
    ["mensaje demasiado largo", { message: "x".repeat(2001) }],
    ["sin propiedad", { propertyId: " " }],
  ])("rechaza %s", (_label, override) => {
    expect(inquiryInputSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

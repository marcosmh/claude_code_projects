import { describe, expect, it } from "vitest";
import { systemSettingsSchema } from "./system-settings";

const valid = {
  allowRegistration: true,
  defaultCurrency: "USD",
  contactEmail: "contacto@portal.mx",
  contactPhone: "+52 (55) 1234-5678",
};

describe("systemSettingsSchema", () => {
  it("acepta ajustes válidos", () => {
    expect(systemSettingsSchema.parse(valid)).toEqual(valid);
  });

  it("convierte cadenas vacías o con espacios en null", () => {
    const parsed = systemSettingsSchema.parse({ ...valid, contactEmail: "  ", contactPhone: "" });
    expect(parsed.contactEmail).toBeNull();
    expect(parsed.contactPhone).toBeNull();
  });

  it("acepta null y recorta espacios", () => {
    const parsed = systemSettingsSchema.parse({
      ...valid,
      contactEmail: null,
      contactPhone: "  5512345678 ",
    });
    expect(parsed.contactEmail).toBeNull();
    expect(parsed.contactPhone).toBe("5512345678");
  });

  it.each([
    ["email inválido", { contactEmail: "no-es-email" }],
    ["teléfono corto", { contactPhone: "123" }],
    ["teléfono con letras", { contactPhone: "55-abcd-1234" }],
    ["moneda desconocida", { defaultCurrency: "EUR" }],
    ["registro no booleano", { allowRegistration: "si" }],
  ])("rechaza %s", (_name, override) => {
    expect(systemSettingsSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

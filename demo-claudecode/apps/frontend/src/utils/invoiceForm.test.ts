import { describe, expect, it } from "vitest";
import { mapServerErrors } from "./invoiceForm";

describe("mapServerErrors", () => {
  it("mapea campos y renombra unitPriceCents a price", () => {
    const result = mapServerErrors(
      [
        { field: "clientName", message: "a" },
        { field: "items.2.unitPriceCents", message: "b" },
        { field: "items", message: "c" },
        { message: "d" },
      ],
      "x",
    );
    expect(result.fields).toEqual([
      { name: "clientName", message: "a" },
      { name: "items.2.price", message: "b" },
    ]);
    expect(result.general).toEqual(["c", "d"]);
  });

  it("usa el mensaje de respaldo si no hay detalles", () => {
    expect(mapServerErrors([], "Falló")).toEqual({ fields: [], general: ["Falló"] });
  });
});

import { invoiceFormSchema, type InvoiceFormValues } from "./invoiceForm";
import { LIMITS } from "./limits";

const validForm: InvoiceFormValues = {
  clientName: "Acme",
  clientEmail: "",
  clientAddress: "",
  issueDate: "2026-10-01",
  dueDate: "2026-11-01",
  status: "DRAFT",
  taxRate: "16",
  currency: "MXN",
  notes: "",
  items: [{ description: "Servicio", quantity: "2", price: "100.50" }],
};
const withItem = (over: Partial<InvoiceFormValues["items"][number]>): InvoiceFormValues => ({
  ...validForm,
  items: [{ ...validForm.items[0], ...over } as InvoiceFormValues["items"][number]],
});

describe("invoiceFormSchema: rangos alineados con el backend", () => {
  it("convierte a centavos y acepta los valores en el borde", () => {
    const ok = invoiceFormSchema.parse(validForm);
    expect(ok.items[0]).toEqual({ description: "Servicio", quantity: 2, unitPriceCents: 10050 });
    expect(invoiceFormSchema.safeParse(withItem({ quantity: String(LIMITS.quantity), price: String(LIMITS.price) })).success).toBe(true);
    expect(invoiceFormSchema.safeParse({ ...validForm, taxRate: "100" }).success).toBe(true);
    expect(invoiceFormSchema.safeParse({ ...validForm, taxRate: "0" }).success).toBe(true);
  });

  it.each([
    ["cantidad 0", withItem({ quantity: "0" }), /mayor que 0/],
    ["cantidad negativa", withItem({ quantity: "-3" }), /mayor que 0/],
    ["cantidad sobre el tope", withItem({ quantity: String(LIMITS.quantity + 1) }), /no puede superar/],
    ["precio negativo", withItem({ price: "-1" }), /negativo/],
    ["precio sobre el tope", withItem({ price: String(LIMITS.price + 1) }), /no puede superar/],
    ["impuesto > 100", { ...validForm, taxRate: "101" }, /entre 0 y 100/],
    ["impuesto negativo", { ...validForm, taxRate: "-1" }, /entre 0 y 100/],
    ["cliente largo", { ...validForm, clientName: "x".repeat(LIMITS.clientName + 1) }, /Máximo 200/],
    ["notas largas", { ...validForm, notes: "x".repeat(LIMITS.notes + 1) }, /Máximo 2000/],
    ["demasiadas líneas", { ...validForm, items: Array.from({ length: LIMITS.items + 1 }, () => validForm.items[0]) }, /Máximo 100 líneas/],
  ])("rechaza %s con un mensaje claro", (_name, values, message) => {
    const result = invoiceFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(message);
  });
});

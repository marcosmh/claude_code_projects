import { describe, expect, it } from "vitest";
import { invoiceFormSchema } from "@/lib/validators";

const base = {
  clientName: "Acme",
  clientEmail: "",
  clientAddress: "",
  issueDate: "2026-10-01",
  dueDate: "2026-10-31",
  status: "DRAFT",
  taxRate: "16",
  notes: "",
  items: [{ description: "Servicio", quantity: "2", price: "10.50" }],
};

describe("invoiceFormSchema", () => {
  it("convierte texto a números y centavos", () => {
    const r = invoiceFormSchema.parse(base);
    expect(r.taxRate).toBe(16);
    expect(r.items[0]).toEqual({ description: "Servicio", quantity: 2, unitPriceCents: 1050 });
  });

  it("rechaza cliente vacío, cantidad 0 y vencimiento anterior", () => {
    const r = invoiceFormSchema.safeParse({
      ...base,
      clientName: " ",
      dueDate: "2026-09-01",
      items: [{ description: "x", quantity: "0", price: "1" }],
    });
    expect(r.success).toBe(false);
    const msgs = r.error!.issues.map((i) => i.message);
    expect(msgs).toContain("El cliente es obligatorio");
    expect(msgs).toContain("La cantidad debe ser mayor que 0");
    expect(msgs).toContain("El vencimiento no puede ser anterior a la emisión");
  });
});

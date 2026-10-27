import { describe, expect, it } from "vitest";
import { LIMITS } from "./limits";
import { invoiceBodySchema, listQuerySchema, statusSchema } from "./invoice";

const valid = {
  clientName: " Acme ",
  issueDate: "2026-01-01",
  dueDate: "2026-01-31",
  items: [{ description: "Servicio", quantity: 2, unitPriceCents: 1000 }],
};

describe("invoiceBodySchema", () => {
  it("normalises text, empty optionals and defaults", () => {
    const out = invoiceBodySchema.parse({ ...valid, clientEmail: "", notes: "  " });
    expect(out).toMatchObject({ clientName: "Acme", clientEmail: null, clientAddress: null, notes: null, status: "DRAFT", taxRate: 0 });
  });

  it("rejects non-integer cents and out-of-range values", () => {
    expect(invoiceBodySchema.safeParse({ ...valid, items: [{ ...valid.items[0], unitPriceCents: 1.5 }] }).success).toBe(false);
    expect(invoiceBodySchema.safeParse({ ...valid, taxRate: LIMITS.taxRate + 1 }).success).toBe(false);
    expect(invoiceBodySchema.safeParse({ ...valid, issueDate: "01/01/2026" }).success).toBe(false);
  });
});

describe("statusSchema / listQuerySchema", () => {
  it("accepts only the three statuses", () => {
    expect(statusSchema.safeParse("PAID").success).toBe(true);
    expect(statusSchema.safeParse("OVERDUE").success).toBe(false);
  });

  it("coerces and defaults pagination", () => {
    expect(listQuerySchema.parse({ page: "2" })).toMatchObject({ page: 2, pageSize: 10 });
    expect(listQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });
});

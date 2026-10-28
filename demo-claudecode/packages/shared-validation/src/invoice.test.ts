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
    expect(out).toMatchObject({ clientName: "Acme", clientEmail: null, clientAddress: null, notes: null, status: "DRAFT", taxRate: 0, currency: "USD" });
  });

  it("accepts MXN, USD and EUR and rejects any other currency", () => {
    for (const currency of ["MXN", "USD", "EUR"]) expect(invoiceBodySchema.parse({ ...valid, currency }).currency).toBe(currency);
    expect(invoiceBodySchema.safeParse({ ...valid, currency: "GBP" }).success).toBe(false);
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

  it("accepts one or several comma-separated statuses and de-duplicates them", () => {
    expect(listQuerySchema.parse({ status: "SENT" }).status).toEqual(["SENT"]);
    expect(listQuerySchema.parse({ status: "DRAFT, SENT,DRAFT" }).status).toEqual(["DRAFT", "SENT"]);
    expect(listQuerySchema.parse({}).status).toBeUndefined();
    expect(listQuerySchema.safeParse({ status: "SENT,OVERDUE" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ status: "" }).success).toBe(false);
  });

  it("validates the issue date range", () => {
    expect(listQuerySchema.parse({ issuedFrom: "2026-01-01", issuedTo: "2026-01-31" })).toMatchObject({ issuedFrom: "2026-01-01" });
    expect(listQuerySchema.safeParse({ issuedFrom: "01/01/2026" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ issuedFrom: "2026-02-01", issuedTo: "2026-01-01" }).success).toBe(false);
  });

  it("amount range needs a currency and must be ordered", () => {
    expect(listQuerySchema.parse({ currency: "MXN", minTotalCents: "1000", maxTotalCents: "5000" })).toMatchObject({ minTotalCents: 1000, maxTotalCents: 5000 });
    expect(listQuerySchema.safeParse({ minTotalCents: "1000" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ currency: "MXN", minTotalCents: "5000", maxTotalCents: "1000" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ currency: "MXN", minTotalCents: "-1" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ currency: "MXN", minTotalCents: "10.5" }).success).toBe(false);
  });

  it("coerces and defaults pagination", () => {
    expect(listQuerySchema.parse({ page: "2" })).toMatchObject({ page: 2, pageSize: 10 });
    expect(listQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });
});

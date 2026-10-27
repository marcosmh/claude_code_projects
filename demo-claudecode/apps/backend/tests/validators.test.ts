import { describe, expect, it } from "vitest";
import {
  LIMITS,
  idParamSchema,
  invoiceBodySchema,
  listQuerySchema,
  monthlyQuerySchema,
  statusBodySchema,
} from "../src/validators/invoice.validator";

const valid = {
  clientName: "  Acme ",
  issueDate: "2026-09-01",
  dueDate: "2026-10-01T00:00:00Z",
  items: [{ description: "X", quantity: 1, unitPriceCents: 100 }],
};

describe("invoiceBodySchema", () => {
  it("normaliza y aplica valores por defecto", () => {
    const r = invoiceBodySchema.parse({ ...valid, clientEmail: "", notes: "  " });
    expect(r).toMatchObject({
      clientName: "Acme",
      clientEmail: null,
      clientAddress: null,
      notes: null,
      status: "DRAFT",
      taxRate: 0,
    });
  });

  it.each([
    ["cliente vacío", { clientName: " " }],
    ["fecha inválida", { issueDate: "01/09/2026" }],
    ["email inválido", { clientEmail: "nope" }],
    ["estado inválido", { status: "OVERDUE" }],
    ["impuesto > 100", { taxRate: 101 }],
    ["precio decimal", { items: [{ description: "X", quantity: 1, unitPriceCents: 10.5 }] }],
    ["precio negativo", { items: [{ description: "X", quantity: 1, unitPriceCents: -1 }] }],
    ["descripción vacía", { items: [{ description: "", quantity: 1, unitPriceCents: 1 }] }],
    ["cantidad string", { items: [{ description: "X", quantity: "1", unitPriceCents: 1 }] }],
    ["sin items", { items: undefined }],
    ["cliente demasiado largo", { clientName: "x".repeat(LIMITS.clientName + 1) }],
    ["dirección demasiado larga", { clientAddress: "x".repeat(LIMITS.clientAddress + 1) }],
    ["notas demasiado largas", { notes: "x".repeat(LIMITS.notes + 1) }],
    ["descripción demasiado larga", { items: [{ description: "x".repeat(LIMITS.description + 1), quantity: 1, unitPriceCents: 1 }] }],
    ["cantidad sobre el límite", { items: [{ description: "X", quantity: LIMITS.quantity + 1, unitPriceCents: 1 }] }],
    ["precio sobre el límite", { items: [{ description: "X", quantity: 1, unitPriceCents: LIMITS.unitPriceCents + 1 }] }],
    ["cantidad Infinity", { items: [{ description: "X", quantity: Infinity, unitPriceCents: 1 }] }],
    ["demasiadas líneas", { items: Array.from({ length: LIMITS.items + 1 }, () => valid.items[0]) }],
  ])("rechaza %s", (_name, over) => {
    expect(invoiceBodySchema.safeParse({ ...valid, ...over }).success).toBe(false);
  });
});

describe("límites en el borde", () => {
  it("acepta exactamente los máximos y el total sigue siendo entero seguro", () => {
    const item = { description: "x".repeat(LIMITS.description), quantity: LIMITS.quantity, unitPriceCents: LIMITS.unitPriceCents };
    const r = invoiceBodySchema.parse({ ...valid, clientName: "x".repeat(LIMITS.clientName), items: Array.from({ length: LIMITS.items }, () => item) });
    const subtotal = r.items.reduce((acc, i) => acc + Math.round(i.quantity * i.unitPriceCents), 0);
    expect(Number.isSafeInteger(subtotal * 2)).toBe(true);
  });
});

describe("otros validators", () => {
  it("statusBodySchema", () => {
    expect(statusBodySchema.parse({ status: "PAID" })).toEqual({ status: "PAID" });
    expect(statusBodySchema.safeParse({ status: "x" }).success).toBe(false);
  });

  it("idParamSchema", () => {
    expect(idParamSchema.parse("12")).toBe(12);
    for (const bad of ["0", "-1", "abc", "1.5", ""]) {
      expect(idParamSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("listQuerySchema rechaza page sobre el tope", () => {
    expect(listQuerySchema.safeParse({ page: String(LIMITS.page + 1) }).success).toBe(false);
  });

  it("listQuerySchema aplica defaults y límites", () => {
    expect(listQuerySchema.parse({})).toEqual({ page: 1, pageSize: 10 });
    expect(listQuerySchema.parse({ page: "2", pageSize: "50", status: "SENT" })).toMatchObject({
      page: 2,
      pageSize: 50,
      status: "SENT",
    });
    expect(listQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ status: "OVERDUE" }).success).toBe(false);
  });

  it("monthlyQuerySchema", () => {
    expect(monthlyQuerySchema.parse({})).toEqual({ months: 6 });
    expect(monthlyQuerySchema.safeParse({ months: "25" }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { buildInvoiceNumber, calcTotals, isOverdue } from "../src/domain/invoice";

describe("domain/invoice", () => {
  it("calcTotals redondea por línea e impuesto", () => {
    expect(calcTotals([{ quantity: 1.5, unitPriceCents: 999 }], 16)).toEqual({
      subtotalCents: 1499,
      taxCents: 240,
      totalCents: 1739,
    });
    expect(calcTotals([], 10)).toEqual({ subtotalCents: 0, taxCents: 0, totalCents: 0 });
  });

  it("buildInvoiceNumber rellena a 4 dígitos", () => {
    expect(buildInvoiceNumber(7)).toBe("FAC-0007");
    expect(buildInvoiceNumber(12345)).toBe("FAC-12345");
  });

  it("isOverdue solo para SENT vencida", () => {
    const now = new Date("2026-10-10");
    const past = new Date("2026-10-01");
    expect(isOverdue({ status: "SENT", dueDate: past }, now)).toBe(true);
    expect(isOverdue({ status: "PAID", dueDate: past }, now)).toBe(false);
    expect(isOverdue({ status: "DRAFT", dueDate: past }, now)).toBe(false);
    expect(isOverdue({ status: "SENT", dueDate: new Date("2026-10-20") }, now)).toBe(false);
  });
});

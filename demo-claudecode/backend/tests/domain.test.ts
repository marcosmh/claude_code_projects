import { describe, expect, it } from "vitest";
import { buildInvoiceNumber, calcTotals, isOverdue, lineAmountCents, roundCents } from "../src/domain/invoice";

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

describe("domain/invoice: redondeo en el límite", () => {
  it("el medio centavo exacto sube aunque la coma flotante lo deje por debajo", () => {
    // 1.005 * 100 === 100.49999999999999 en IEEE-754; el valor real es 100.5 centavos.
    expect(1.005 * 100).toBeLessThan(100.5);
    expect(lineAmountCents({ quantity: 1.005, unitPriceCents: 100 })).toBe(101);
    expect(lineAmountCents({ quantity: 1.15, unitPriceCents: 100 })).toBe(115);
    expect(lineAmountCents({ quantity: 0.145, unitPriceCents: 1000 })).toBe(145);
  });

  it("medio centavo exacto: siempre hacia arriba", () => {
    expect(roundCents(0.5)).toBe(1);
    expect(roundCents(2.5)).toBe(3);
    expect(roundCents(1234.5)).toBe(1235);
  });

  it("por debajo y por encima del medio centavo", () => {
    expect(lineAmountCents({ quantity: 1.004, unitPriceCents: 100 })).toBe(100);
    expect(lineAmountCents({ quantity: 1.006, unitPriceCents: 100 })).toBe(101);
  });

  it("el impuesto también redondea medio centavo hacia arriba", () => {
    expect(calcTotals([{ quantity: 1, unitPriceCents: 5 }], 10)).toEqual({ subtotalCents: 5, taxCents: 1, totalCents: 6 });
    expect(calcTotals([{ quantity: 1, unitPriceCents: 1001 }], 0.5)).toEqual({ subtotalCents: 1001, taxCents: 5, totalCents: 1006 });
    expect(calcTotals([{ quantity: 1, unitPriceCents: 25 }], 10).taxCents).toBe(3);
  });

  it("cada línea se redondea por separado antes de sumar", () => {
    const items = [
      { quantity: 1.005, unitPriceCents: 100 },
      { quantity: 1.005, unitPriceCents: 100 },
    ];
    expect(calcTotals(items, 0).subtotalCents).toBe(202);
  });

  it("los extremos permitidos siguen siendo enteros seguros", () => {
    const max = { quantity: 100_000, unitPriceCents: 100_000_000 };
    const { totalCents } = calcTotals(Array.from({ length: 100 }, () => max), 100);
    expect(Number.isSafeInteger(totalCents)).toBe(true);
    expect(totalCents).toBe(2 * 100 * 1e13);
  });
});

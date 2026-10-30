import { describe, expect, it } from "vitest";
import { calcTotals, lineAmountCents, roundCents, toInvoiceView } from "../src/domain/totals.js";
import { invoice } from "./helpers.js";

// The expected values are the ones in the tests of @invoices/shared-utils: the backend and this server must agree.
describe("totals", () => {
  it("redondea mitades hacia arriba e ignora el ruido de coma flotante", () => {
    expect(roundCents(0.5)).toBe(1);
    expect(roundCents(2.5)).toBe(3);
    expect(roundCents(1.005 * 100)).toBe(101);
  });

  it("redondea por línea y sobre el impuesto", () => {
    expect(lineAmountCents({ quantity: 1.5, unitPriceCents: 999 })).toBe(1499);
    expect(calcTotals([{ quantity: 1.5, unitPriceCents: 999 }], 16)).toEqual({
      subtotalCents: 1499,
      taxCents: 240,
      totalCents: 1739,
    });
    expect(calcTotals([], 10)).toEqual({ subtotalCents: 0, taxCents: 0, totalCents: 0 });
  });

  it.each([
    [5, 10, 1],
    [1001, 0.5, 5],
    [25, 10, 3],
  ])("impuesto sobre %i centavos al %f %% = %i", (unitPriceCents, taxRate, taxCents) => {
    expect(calcTotals([{ quantity: 1, unitPriceCents }], taxRate).taxCents).toBe(taxCents);
  });

  it("toInvoiceView añade el subtotal de cada línea y los totales", () => {
    const view = toInvoiceView(invoice());
    expect(view.lines.map((l) => l.subtotalCents)).toEqual([40000, 100000]);
    expect(view).toMatchObject({ subtotalCents: 140000, taxCents: 22400, totalCents: 162400, clientName: "ACME SA" });
  });
});

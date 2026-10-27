import { describe, expect, it } from "vitest";
import { calcTotals } from "@/lib/totals";

describe("calcTotals", () => {
  it("suma líneas y aplica impuesto", () => {
    const t = calcTotals(
      [
        { quantity: 2, unitPriceCents: 1000 },
        { quantity: 1, unitPriceCents: 550 },
      ],
      10,
    );
    expect(t).toEqual({ subtotalCents: 2550, taxCents: 255, totalCents: 2805 });
  });

  it("impuesto 0%", () => {
    expect(calcTotals([{ quantity: 1, unitPriceCents: 999 }], 0).totalCents).toBe(999);
  });

  it("cantidades decimales con redondeo", () => {
    const t = calcTotals([{ quantity: 1.5, unitPriceCents: 333 }], 21);
    expect(t.subtotalCents).toBe(500);
    expect(t.taxCents).toBe(105);
  });

  it("sin líneas", () => {
    expect(calcTotals([], 21)).toEqual({ subtotalCents: 0, taxCents: 0, totalCents: 0 });
  });
});

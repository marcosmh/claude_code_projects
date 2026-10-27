import { describe, expect, it } from "vitest";
import { previewTotals } from "./totalsPreview";

describe("previewTotals", () => {
  it("suma líneas, aplica el impuesto y redondea a centavos", () => {
    const totals = previewTotals(
      [
        { quantity: 2, unitPriceCents: 5000 },
        { quantity: 1.5, unitPriceCents: 333 },
      ],
      16,
    );
    expect(totals).toEqual({ subtotalCents: 10500, taxCents: 1680, totalCents: 12180 });
  });

  it("devuelve ceros sin líneas", () => {
    expect(previewTotals([], 16)).toEqual({ subtotalCents: 0, taxCents: 0, totalCents: 0 });
  });

  it("sin impuesto el total es el subtotal", () => {
    expect(previewTotals([{ quantity: 3, unitPriceCents: 100 }], 0)).toEqual({
      subtotalCents: 300,
      taxCents: 0,
      totalCents: 300,
    });
  });

  it("redondea igual que el backend: medio centavo hacia arriba (1.005 × 100 = 101)", () => {
    expect(previewTotals([{ quantity: 1.005, unitPriceCents: 100 }], 0).subtotalCents).toBe(101);
    expect(previewTotals([{ quantity: 1, unitPriceCents: 5 }], 10).taxCents).toBe(1);
  });
});

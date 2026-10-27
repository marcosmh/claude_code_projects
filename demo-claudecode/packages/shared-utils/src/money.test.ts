import { describe, expect, it } from "vitest";
import { calcTotals, lineAmountCents, roundCents, toCents } from "./money";

describe("roundCents", () => {
  it("rounds half up and ignores binary floating-point noise", () => {
    expect(roundCents(0.5)).toBe(1);
    expect(roundCents(2.5)).toBe(3);
    expect(roundCents(1234.5)).toBe(1235);
    expect(roundCents(1.005 * 100)).toBe(101);
  });
});

describe("lineAmountCents", () => {
  it("multiplies and rounds", () => {
    expect(lineAmountCents({ quantity: 1.5, unitPriceCents: 999 })).toBe(1499);
  });
});

describe("calcTotals", () => {
  it("rounds per line and on the tax", () => {
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
  ])("tax on %i cents at %f%% rounds half up to %i", (unitPriceCents, taxRate, taxCents) => {
    expect(calcTotals([{ quantity: 1, unitPriceCents }], taxRate).taxCents).toBe(taxCents);
  });

  it("stays exact at the input limits", () => {
    const max = { quantity: 100_000, unitPriceCents: 100_000_000 };
    const { totalCents } = calcTotals(Array.from({ length: 100 }, () => max), 100);
    expect(totalCents).toBe(100 * 1e13 * 2);
  });
});

describe("toCents", () => {
  it.each([
    [0, 0],
    [1, 100],
    [12.34, 1234],
    [1.005, 101],
    [19.99, 1999],
    [0.07, 7],
    [1_000_000, 100_000_000],
  ])("%f units -> %i cents", (units, cents) => {
    expect(toCents(units)).toBe(cents);
  });
});

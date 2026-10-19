import { describe, expect, it } from "vitest";
import { monthlyTotals, summarize, type InvoiceLike } from "@/lib/stats";

const inv = (status: string, issue: string, due: string, price: number): InvoiceLike => ({
  status,
  issueDate: new Date(issue),
  dueDate: new Date(due),
  taxRate: 0,
  items: [{ quantity: 1, unitPriceCents: price }],
});

const now = new Date("2026-10-19T12:00:00Z");
const data = [
  inv("PAID", "2026-09-01", "2026-10-01", 1000),
  inv("SENT", "2026-09-10", "2026-10-10", 500),
  inv("SENT", "2026-10-05", "2026-11-05", 300),
  inv("DRAFT", "2026-10-06", "2026-11-06", 200),
  inv("DRAFT", "2025-01-01", "2025-02-01", 999),
];

describe("summarize", () => {
  it("agrupa por estado y detecta vencidas", () => {
    const s = summarize(data, now);
    expect(s.byStatus.PAID).toEqual({ count: 1, totalCents: 1000 });
    expect(s.byStatus.SENT).toEqual({ count: 2, totalCents: 800 });
    expect(s.byStatus.DRAFT.count).toBe(2);
    expect(s.overdue).toEqual({ count: 1, totalCents: 500 });
    expect(s.totalCount).toBe(5);
  });
});

describe("monthlyTotals", () => {
  it("devuelve 6 meses terminando en el actual y descarta los fuera de rango", () => {
    const m = monthlyTotals(data, now);
    expect(m.map((b) => b.key)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(m[4].totalsCents).toEqual({ DRAFT: 0, SENT: 500, PAID: 1000 });
    expect(m[5].totalsCents).toEqual({ DRAFT: 200, SENT: 300, PAID: 0 });
  });
});

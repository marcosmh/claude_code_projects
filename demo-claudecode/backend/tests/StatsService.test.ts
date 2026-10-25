import { describe, expect, it } from "vitest";
import { StatsService } from "../src/services/StatsService";
import { FakeInvoiceRepository, sampleData } from "./helpers/FakeInvoiceRepository";

const NOW = new Date("2026-10-10T12:00:00Z");

async function setup() {
  const repo = new FakeInvoiceRepository();
  // total each: 2 * 10000 = 20000 + 10% = 22000
  await repo.create({ ...sampleData({ status: "DRAFT" }), number: "1" });
  await repo.create({ ...sampleData({ status: "SENT", dueDate: new Date("2026-10-01") }), number: "2" }); // overdue
  await repo.create({ ...sampleData({ status: "SENT", dueDate: new Date("2026-11-01") }), number: "3" });
  await repo.create({
    ...sampleData({ status: "PAID", issueDate: new Date("2026-07-15"), dueDate: new Date("2026-08-01") }),
    number: "4",
  });
  await repo.create({
    ...sampleData({ status: "PAID", issueDate: new Date("2025-01-15"), dueDate: new Date("2025-02-01") }),
    number: "5",
  });
  return new StatsService(repo, () => NOW);
}

describe("StatsService", () => {
  it("summary agrupa por estado y calcula vencidas", async () => {
    const s = await (await setup()).summary();
    expect(s.totalCount).toBe(5);
    expect(s.byStatus.DRAFT).toEqual({ count: 1, totalCents: 22000 });
    expect(s.byStatus.SENT).toEqual({ count: 2, totalCents: 44000 });
    expect(s.byStatus.PAID.count).toBe(2);
    expect(s.overdue).toEqual({ count: 1, totalCents: 22000 });
  });

  it("monthly devuelve N meses terminando en el actual", async () => {
    const m = await (await setup()).monthly(6);
    expect(m.map((b) => b.key)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(m[2].totalsCents.PAID).toBe(22000);
    expect(m[4].totalsCents).toEqual({ DRAFT: 22000, SENT: 44000, PAID: 0 });
    expect(m[0].label).toBe("may");
    expect(m[5].title).toContain("octubre");
  });

  it("monthly ignora facturas fuera de rango", async () => {
    const m = await (await setup()).monthly(3);
    expect(m).toHaveLength(3);
    expect(m.reduce((n, b) => n + b.totalsCents.PAID, 0)).toBe(0);
  });
});

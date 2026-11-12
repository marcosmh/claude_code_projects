import { describe, expect, it, vi } from "vitest";
import type { AdminReportsRawData } from "@/repositories/admin-reports-repository";
import { createAdminReportsService, lastMonthKeys } from "./admin-reports-service";

const now = new Date("2026-11-12T10:00:00.000Z");

function rawData(overrides: Partial<AdminReportsRawData> = {}): AdminReportsRawData {
  return {
    propertiesByOperation: [],
    propertiesByType: [],
    propertiesByAvailability: [],
    propertiesByPublished: [],
    topCities: [],
    averagePrices: [],
    inquiries: { total: 0, last30Days: 0, fromUsers: 0, topProperties: [] },
    favorites: { total: 0, topProperties: [] },
    users: { total: 0, active: 0, admins: 0 },
    monthlyProperties: [],
    monthlyInquiries: [],
    monthlyUsers: [],
    ...overrides,
  };
}

describe("lastMonthKeys", () => {
  it("devuelve los meses del más antiguo al actual, cruzando el año", () => {
    expect(lastMonthKeys(new Date("2026-02-15T00:00:00Z"), 4)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("createAdminReportsService", () => {
  it("pide al repositorio desde el primer mes de la serie y los últimos 30 días", async () => {
    const collect = vi.fn().mockResolvedValue(rawData());
    await createAdminReportsService({ collect }, () => now).getReports();

    expect(collect).toHaveBeenCalledWith({
      since: new Date("2026-06-01T00:00:00.000Z"),
      last30DaysStart: new Date("2026-10-13T10:00:00.000Z"),
    });
  });

  it("completa con cero las claves sin datos y mantiene el orden", async () => {
    const reports = await createAdminReportsService(
      {
        collect: async () =>
          rawData({
            propertiesByOperation: [{ key: "RENT", count: 3 }],
            propertiesByType: [{ key: "LAND", count: 2 }],
            propertiesByAvailability: [{ key: "SOLD", count: 1 }],
            propertiesByPublished: [{ key: true, count: 4 }],
          }),
      },
      () => now,
    ).getReports();

    expect(reports.properties.byOperation).toEqual([
      { key: "SALE", count: 0 },
      { key: "RENT", count: 3 },
    ]);
    expect(reports.properties.byType.map((entry) => entry.key)).toEqual([
      "HOUSE",
      "APARTMENT",
      "LAND",
      "OFFICE",
      "COMMERCIAL",
      "OTHER",
    ]);
    expect(reports.properties.byType.find((entry) => entry.key === "LAND")?.count).toBe(2);
    expect(reports.properties.byAvailability).toEqual([
      { key: "AVAILABLE", count: 0 },
      { key: "SOLD", count: 1 },
      { key: "RENTED", count: 0 },
    ]);
    expect(reports.properties.byVisibility).toEqual([
      { key: "PUBLISHED", count: 4 },
      { key: "DRAFT", count: 0 },
    ]);
  });

  it("deriva visitantes y usuarios desactivados", async () => {
    const reports = await createAdminReportsService(
      {
        collect: async () =>
          rawData({
            inquiries: { total: 10, last30Days: 4, fromUsers: 3, topProperties: [] },
            users: { total: 8, active: 6, admins: 2 },
          }),
      },
      () => now,
    ).getReports();

    expect(reports.inquiries).toMatchObject({ total: 10, fromUsers: 3, fromVisitors: 7 });
    expect(reports.users).toEqual({ total: 8, active: 6, inactive: 2, admins: 2 });
  });

  it("arma 6 meses con ceros donde no hay actividad", async () => {
    const reports = await createAdminReportsService(
      {
        collect: async () =>
          rawData({
            monthlyProperties: [{ month: "2026-11", count: 2 }],
            monthlyInquiries: [{ month: "2026-09", count: 5 }],
            monthlyUsers: [{ month: "2026-06", count: 1 }],
          }),
      },
      () => now,
    ).getReports();

    expect(reports.generatedAt).toBe(now.toISOString());
    expect(reports.monthly.map((entry) => entry.month)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(reports.monthly[0]).toEqual({ month: "2026-06", properties: 0, inquiries: 0, users: 1 });
    expect(reports.monthly[3]).toMatchObject({ inquiries: 5 });
    expect(reports.monthly[5]).toMatchObject({ properties: 2 });
  });
});

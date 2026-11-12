import type {
  AdminReportsRepository,
  AdminReportsRawData,
} from "@/repositories/admin-reports-repository";
import type {
  AdminReportsDto,
  PropertyAvailability,
  PropertyOperation,
  PropertyType,
  ReportCountDto,
} from "@portal/shared-types";

const MONTHS_IN_SERIES = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

const operations: PropertyOperation[] = ["SALE", "RENT"];
const types: PropertyType[] = ["HOUSE", "APARTMENT", "LAND", "OFFICE", "COMMERCIAL", "OTHER"];
const availabilities: PropertyAvailability[] = ["AVAILABLE", "SOLD", "RENTED"];

/** Una entrada por cada clave esperada (0 si no hay datos), en el orden indicado. */
function fillKeys<TKey extends string>(
  keys: readonly TKey[],
  counts: { key: TKey; count: number }[],
): ReportCountDto<TKey>[] {
  return keys.map((key) => ({
    key,
    count: counts.find((entry) => entry.key === key)?.count ?? 0,
  }));
}

/** Claves `YYYY-MM` de los últimos meses (UTC), del más antiguo al actual. */
export function lastMonthKeys(now: Date, length: number): string[] {
  return Array.from({ length }, (_, index) => {
    const month = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (length - 1 - index), 1),
    );
    return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function toDto(raw: AdminReportsRawData, now: Date): AdminReportsDto {
  const publishedCount = raw.propertiesByPublished.find((entry) => entry.key)?.count ?? 0;
  const draftCount = raw.propertiesByPublished.find((entry) => !entry.key)?.count ?? 0;
  const countIn = (rows: { month: string; count: number }[], month: string) =>
    rows.find((row) => row.month === month)?.count ?? 0;

  return {
    generatedAt: now.toISOString(),
    properties: {
      byOperation: fillKeys(operations, raw.propertiesByOperation),
      byType: fillKeys(types, raw.propertiesByType),
      byAvailability: fillKeys(availabilities, raw.propertiesByAvailability),
      byVisibility: [
        { key: "PUBLISHED", count: publishedCount },
        { key: "DRAFT", count: draftCount },
      ],
      topCities: raw.topCities,
      averagePrices: raw.averagePrices,
    },
    inquiries: {
      total: raw.inquiries.total,
      last30Days: raw.inquiries.last30Days,
      fromUsers: raw.inquiries.fromUsers,
      fromVisitors: raw.inquiries.total - raw.inquiries.fromUsers,
      topProperties: raw.inquiries.topProperties,
    },
    favorites: raw.favorites,
    users: {
      total: raw.users.total,
      active: raw.users.active,
      inactive: raw.users.total - raw.users.active,
      admins: raw.users.admins,
    },
    monthly: lastMonthKeys(now, MONTHS_IN_SERIES).map((month) => ({
      month,
      properties: countIn(raw.monthlyProperties, month),
      inquiries: countIn(raw.monthlyInquiries, month),
      users: countIn(raw.monthlyUsers, month),
    })),
  };
}

/** Reportes del panel de administración. La autorización (ADMIN) se aplica en la ruta. */
export function createAdminReportsService(
  repository: AdminReportsRepository,
  clock: () => Date = () => new Date(),
) {
  return {
    async getReports(): Promise<AdminReportsDto> {
      const now = clock();
      const [firstMonth] = lastMonthKeys(now, MONTHS_IN_SERIES);
      const raw = await repository.collect({
        since: new Date(`${firstMonth}-01T00:00:00.000Z`),
        last30DaysStart: new Date(now.getTime() - 30 * DAY_MS),
      });
      return toDto(raw, now);
    },
  };
}

export type AdminReportsService = ReturnType<typeof createAdminReportsService>;

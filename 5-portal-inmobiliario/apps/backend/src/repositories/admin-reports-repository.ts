import "server-only";
import { database } from "@/lib/database/client";
import type {
  Currency,
  PropertyAvailability,
  PropertyOperation,
  PropertyType,
} from "@portal/shared-types";

type Counted<TKey> = { key: TKey; count: number };
type TopProperty = { id: string; title: string; count: number };
/** Cantidad creada en un mes (`month` con formato `YYYY-MM`). */
type MonthlyCount = { month: string; count: number };

/** Agregados sin completar: el servicio añade las claves en cero y arma la serie mensual. */
export type AdminReportsRawData = {
  propertiesByOperation: Counted<PropertyOperation>[];
  propertiesByType: Counted<PropertyType>[];
  propertiesByAvailability: Counted<PropertyAvailability>[];
  propertiesByPublished: Counted<boolean>[];
  topCities: Counted<string>[];
  averagePrices: {
    operation: PropertyOperation;
    currency: Currency;
    average: number;
    count: number;
  }[];
  inquiries: { total: number; last30Days: number; fromUsers: number; topProperties: TopProperty[] };
  favorites: { total: number; topProperties: TopProperty[] };
  users: { total: number; active: number; admins: number };
  monthlyProperties: MonthlyCount[];
  monthlyInquiries: MonthlyCount[];
  monthlyUsers: MonthlyCount[];
};

export type AdminReportsRepository = {
  /** `since` es el inicio del primer mes de la serie; `last30DaysStart`, el corte de «últimos 30 días». */
  collect(input: { since: Date; last30DaysStart: Date }): Promise<AdminReportsRawData>;
};

const TOP_LIMIT = 5;
const notDeleted = { deletedAt: null };

async function topProperties(
  groups: { propertyId: string; count: number }[],
): Promise<TopProperty[]> {
  if (groups.length === 0) return [];
  const properties = await database.property.findMany({
    where: { id: { in: groups.map((group) => group.propertyId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(properties.map((property) => [property.id, property.title]));
  return groups.map((group) => ({
    id: group.propertyId,
    title: titleById.get(group.propertyId) ?? "Propiedad",
    count: group.count,
  }));
}

export const adminReportsRepository: AdminReportsRepository = {
  async collect({ since, last30DaysStart }) {
    const [
      propertiesByOperation,
      propertiesByType,
      propertiesByAvailability,
      propertiesByPublished,
      topCities,
      averagePrices,
      inquiriesTotal,
      inquiriesLast30Days,
      inquiriesFromUsers,
      inquiriesByProperty,
      favoritesTotal,
      favoritesByProperty,
      usersTotal,
      usersActive,
      usersAdmins,
      monthlyProperties,
      monthlyInquiries,
      monthlyUsers,
    ] = await Promise.all([
      database.property.groupBy({ by: ["operation"], where: notDeleted, _count: { _all: true } }),
      database.property.groupBy({ by: ["type"], where: notDeleted, _count: { _all: true } }),
      database.property.groupBy({
        by: ["availability"],
        where: notDeleted,
        _count: { _all: true },
      }),
      database.property.groupBy({ by: ["isPublished"], where: notDeleted, _count: { _all: true } }),
      database.property.groupBy({
        by: ["city"],
        where: notDeleted,
        _count: { _all: true },
        orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
        take: TOP_LIMIT,
      }),
      database.property.groupBy({
        by: ["operation", "currency"],
        where: { ...notDeleted, isPublished: true },
        _avg: { price: true },
        _count: { _all: true },
      }),
      database.inquiry.count({ where: { property: notDeleted } }),
      database.inquiry.count({
        where: { property: notDeleted, createdAt: { gte: last30DaysStart } },
      }),
      database.inquiry.count({ where: { property: notDeleted, userId: { not: null } } }),
      database.inquiry.groupBy({
        by: ["propertyId"],
        where: { property: notDeleted },
        _count: { _all: true },
        orderBy: [{ _count: { propertyId: "desc" } }, { propertyId: "asc" }],
        take: TOP_LIMIT,
      }),
      database.favorite.count({ where: { property: notDeleted } }),
      database.favorite.groupBy({
        by: ["propertyId"],
        where: { property: notDeleted },
        _count: { _all: true },
        orderBy: [{ _count: { propertyId: "desc" } }, { propertyId: "asc" }],
        take: TOP_LIMIT,
      }),
      database.user.count(),
      database.user.count({ where: { isActive: true } }),
      database.user.count({ where: { role: "ADMIN" } }),
      database.$queryRaw<MonthlyCount[]>`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM "properties"
        WHERE "deletedAt" IS NULL AND "createdAt" >= ${since}
        GROUP BY 1`,
      database.$queryRaw<MonthlyCount[]>`
        SELECT to_char(date_trunc('month', i."createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM "inquiries" i
        JOIN "properties" p ON p."id" = i."propertyId"
        WHERE p."deletedAt" IS NULL AND i."createdAt" >= ${since}
        GROUP BY 1`,
      database.$queryRaw<MonthlyCount[]>`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM "users"
        WHERE "createdAt" >= ${since}
        GROUP BY 1`,
    ]);

    const [topInquired, topFavorited] = await Promise.all([
      topProperties(
        inquiriesByProperty.map((group) => ({
          propertyId: group.propertyId,
          count: group._count._all,
        })),
      ),
      topProperties(
        favoritesByProperty.map((group) => ({
          propertyId: group.propertyId,
          count: group._count._all,
        })),
      ),
    ]);

    return {
      propertiesByOperation: propertiesByOperation.map((group) => ({
        key: group.operation,
        count: group._count._all,
      })),
      propertiesByType: propertiesByType.map((group) => ({
        key: group.type,
        count: group._count._all,
      })),
      propertiesByAvailability: propertiesByAvailability.map((group) => ({
        key: group.availability,
        count: group._count._all,
      })),
      propertiesByPublished: propertiesByPublished.map((group) => ({
        key: group.isPublished,
        count: group._count._all,
      })),
      topCities: topCities.map((group) => ({ key: group.city, count: group._count._all })),
      averagePrices: averagePrices.map((group) => ({
        operation: group.operation,
        currency: group.currency,
        average: Number(group._avg.price ?? 0),
        count: group._count._all,
      })),
      inquiries: {
        total: inquiriesTotal,
        last30Days: inquiriesLast30Days,
        fromUsers: inquiriesFromUsers,
        topProperties: topInquired,
      },
      favorites: { total: favoritesTotal, topProperties: topFavorited },
      users: { total: usersTotal, active: usersActive, admins: usersAdmins },
      monthlyProperties,
      monthlyInquiries,
      monthlyUsers,
    };
  },
};

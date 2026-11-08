import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/database/client";
import { escapeLikePattern, splitSearchTerms } from "@/lib/search";

const summaryInclude = {
  images: {
    where: { isPrimary: true },
    select: { url: true },
    take: 1,
  },
} satisfies Prisma.PropertyInclude;

const detailInclude = {
  images: { orderBy: { position: "asc" } },
  features: { orderBy: { name: "asc" } },
} satisfies Prisma.PropertyInclude;

export type PropertySummaryRecord = Prisma.PropertyGetPayload<{
  include: typeof summaryInclude;
}>;
export type PropertyDetailRecord = Prisma.PropertyGetPayload<{
  include: typeof detailInclude;
}>;

export type PropertyFilters = {
  /** Texto libre: título, descripción, colonia, ciudad y estado (sin acentos ni mayúsculas). */
  searchText?: string;
  operation?: "SALE" | "RENT";
  isFeatured?: boolean;
};

export type PaginationOptions = {
  skip: number;
  take: number;
  filters: PropertyFilters;
};

export type PropertyRepository = {
  findPublishedPage(options: PaginationOptions): Promise<PropertySummaryRecord[]>;
  countPublished(filters: PropertyFilters): Promise<number>;
  findPublishedById(propertyId: string): Promise<PropertyDetailRecord | null>;
};

/**
 * Ids de propiedades publicadas que coinciden con el texto. Cada término debe aparecer
 * en algún campo. unaccent + ILIKE ignoran acentos y mayúsculas.
 */
async function findPublishedIdsMatchingSearch(searchText: string): Promise<string[]> {
  const termConditions = splitSearchTerms(searchText).map((term) => {
    const pattern = `%${escapeLikePattern(term)}%`;
    return Prisma.sql`(
      unaccent("title") ILIKE unaccent(${pattern})
      OR unaccent("description") ILIKE unaccent(${pattern})
      OR unaccent("commune") ILIKE unaccent(${pattern})
      OR unaccent("city") ILIKE unaccent(${pattern})
      OR unaccent("region") ILIKE unaccent(${pattern})
    )`;
  });
  if (termConditions.length === 0) return [];

  const rows = await database.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "properties"
    WHERE "isPublished" = true AND ${Prisma.join(termConditions, " AND ")}`;
  return rows.map((row) => row.id);
}

async function buildPublishedWhere(
  filters: PropertyFilters,
): Promise<Prisma.PropertyWhereInput> {
  const matchingIds =
    filters.searchText !== undefined
      ? await findPublishedIdsMatchingSearch(filters.searchText)
      : undefined;

  return {
    isPublished: true,
    ...(matchingIds !== undefined && { id: { in: matchingIds } }),
    ...(filters.operation !== undefined && { operation: filters.operation }),
    ...(filters.isFeatured !== undefined && { isFeatured: filters.isFeatured }),
  };
}

export const propertyRepository: PropertyRepository = {
  async findPublishedPage({ skip, take, filters }) {
    return database.property.findMany({
      where: await buildPublishedWhere(filters),
      include: summaryInclude,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    });
  },

  async countPublished(filters) {
    return database.property.count({ where: await buildPublishedWhere(filters) });
  },

  findPublishedById(propertyId) {
    return database.property.findFirst({
      where: { id: propertyId, isPublished: true },
      include: detailInclude,
    });
  },
};

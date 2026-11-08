import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { PropertyType } from "@/generated/prisma/client";
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
  type?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  /** Mínimo de dormitorios. */
  minBedrooms?: number;
  /** Mínimo de baños. */
  minBathrooms?: number;
  minUsableArea?: number;
  /** Ubicación: coincidencia parcial sin acentos ni mayúsculas. */
  commune?: string;
  city?: string;
  region?: string;
  isFeatured?: boolean;
};

export type PropertySortOption = "newest" | "price_asc" | "price_desc" | "area_asc" | "area_desc";

export type PaginationOptions = {
  skip: number;
  take: number;
  filters: PropertyFilters;
  sort: PropertySortOption;
};

export type PropertyRepository = {
  findPublishedPage(options: PaginationOptions): Promise<PropertySummaryRecord[]>;
  countPublished(filters: PropertyFilters): Promise<number>;
  findPublishedById(propertyId: string): Promise<PropertyDetailRecord | null>;
};

function containsPattern(text: string): string {
  return `%${escapeLikePattern(text)}%`;
}

/**
 * Condiciones de texto (búsqueda libre y ubicación) que requieren unaccent + ILIKE,
 * que Prisma no expresa de forma nativa. Todas deben cumplirse.
 */
function buildTextConditions(filters: PropertyFilters): Prisma.Sql[] {
  const searchConditions = splitSearchTerms(filters.searchText ?? "").map((term) => {
    const pattern = containsPattern(term);
    return Prisma.sql`(
      unaccent("title") ILIKE unaccent(${pattern})
      OR unaccent("description") ILIKE unaccent(${pattern})
      OR unaccent("commune") ILIKE unaccent(${pattern})
      OR unaccent("city") ILIKE unaccent(${pattern})
      OR unaccent("region") ILIKE unaccent(${pattern})
    )`;
  });
  const locationConditions = (
    [
      ["commune", filters.commune],
      ["city", filters.city],
      ["region", filters.region],
    ] as const
  )
    .filter(([, value]) => value !== undefined && value.trim() !== "")
    .map(([column, value]) => {
      const pattern = containsPattern(value as string);
      return Prisma.sql`unaccent(${Prisma.raw(`"${column}"`)}) ILIKE unaccent(${pattern})`;
    });
  return [...searchConditions, ...locationConditions];
}

/** Ids de propiedades publicadas que cumplen todas las condiciones de texto. */
async function findPublishedIdsMatching(conditions: Prisma.Sql[]): Promise<string[]> {
  const rows = await database.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "properties"
    WHERE "isPublished" = true AND ${Prisma.join(conditions, " AND ")}`;
  return rows.map((row) => row.id);
}

async function buildPublishedWhere(filters: PropertyFilters): Promise<Prisma.PropertyWhereInput> {
  const textConditions = buildTextConditions(filters);
  const matchingIds =
    textConditions.length > 0 ? await findPublishedIdsMatching(textConditions) : undefined;
  const hasPriceRange = filters.minPrice !== undefined || filters.maxPrice !== undefined;

  return {
    isPublished: true,
    ...(matchingIds !== undefined && { id: { in: matchingIds } }),
    ...(filters.operation !== undefined && { operation: filters.operation }),
    ...(filters.type !== undefined && { type: filters.type }),
    ...(hasPriceRange && {
      price: {
        ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
        ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
      },
    }),
    ...(filters.minBedrooms !== undefined && { bedrooms: { gte: filters.minBedrooms } }),
    ...(filters.minBathrooms !== undefined && { bathrooms: { gte: filters.minBathrooms } }),
    ...(filters.minUsableArea !== undefined && { usableArea: { gte: filters.minUsableArea } }),
    ...(filters.isFeatured !== undefined && { isFeatured: filters.isFeatured }),
  };
}

/** Orden en PostgreSQL; la superficie nula va siempre al final y `id` desempata para paginar de forma estable. */
function buildOrderBy(sort: PropertySortOption): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ price: "desc" }, { id: "asc" }];
    case "area_asc":
      return [{ usableArea: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    case "area_desc":
      return [{ usableArea: { sort: "desc", nulls: "last" } }, { id: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}

export const propertyRepository: PropertyRepository = {
  async findPublishedPage({ skip, take, filters, sort }) {
    return database.property.findMany({
      where: await buildPublishedWhere(filters),
      include: summaryInclude,
      orderBy: buildOrderBy(sort),
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

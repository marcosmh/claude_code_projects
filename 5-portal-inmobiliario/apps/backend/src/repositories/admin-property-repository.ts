import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/database/client";
import type { AdminPropertyStatus, PropertyInput } from "@portal/shared-types";
import {
  buildAttributeWhere,
  buildTextConditions,
  detailInclude,
  summaryInclude,
  type PropertyDetailRecord,
  type PropertyFilters,
  type PropertySummaryRecord,
} from "./property-repository";

export type AdminPropertyPageOptions = {
  skip: number;
  take: number;
  searchText?: string;
  status: AdminPropertyStatus;
  /** Filtros avanzados (operación, tipo, estado, precio y fecha de publicación). */
  filters?: Omit<PropertyFilters, "searchText">;
};

export type AdminPropertyRepository = {
  findPage(
    options: AdminPropertyPageOptions,
  ): Promise<{ records: PropertySummaryRecord[]; total: number }>;
  findById(propertyId: string): Promise<PropertyDetailRecord | null>;
  create(data: PropertyInput): Promise<PropertyDetailRecord>;
  /** null si la propiedad no existe. */
  update(propertyId: string, data: PropertyInput): Promise<PropertyDetailRecord | null>;
  /** false si la propiedad no existe. */
  remove(propertyId: string): Promise<boolean>;
};

async function buildWhere({
  searchText,
  status,
  filters = {},
}: Pick<
  AdminPropertyPageOptions,
  "searchText" | "status" | "filters"
>): Promise<Prisma.PropertyWhereInput> {
  const where: Prisma.PropertyWhereInput = { deletedAt: null, ...buildAttributeWhere(filters) };
  if (status !== "all") where.isPublished = status === "published";

  const conditions = buildTextConditions({ searchText });
  if (conditions.length > 0) {
    // unaccent + ILIKE no se expresa en Prisma: se resuelven los ids por SQL.
    const rows = await database.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "properties"
      WHERE "deletedAt" IS NULL AND ${Prisma.join(conditions, " AND ")}`;
    where.id = { in: rows.map((row) => row.id) };
  }
  return where;
}

export const adminPropertyRepository: AdminPropertyRepository = {
  async findPage({ skip, take, searchText, status, filters }) {
    const where = await buildWhere({ searchText, status, filters });
    const [records, total] = await Promise.all([
      database.property.findMany({
        where,
        include: summaryInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip,
        take,
      }),
      database.property.count({ where }),
    ]);
    return { records, total };
  },

  findById(propertyId) {
    return database.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      include: detailInclude,
    });
  },

  create(data) {
    return database.property.create({ data, include: detailInclude });
  },

  async update(propertyId, data) {
    // updateMany permite filtrar por deletedAt (update solo acepta claves únicas).
    const { count } = await database.property.updateMany({
      where: { id: propertyId, deletedAt: null },
      data,
    });
    if (count === 0) return null;
    return database.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      include: detailInclude,
    });
  },

  async remove(propertyId) {
    // Borrado lógico: se conserva la fila (y sus imágenes, favoritos y consultas) y se oculta.
    const { count } = await database.property.updateMany({
      where: { id: propertyId, deletedAt: null },
      data: { deletedAt: new Date(), isPublished: false, isFeatured: false },
    });
    return count > 0;
  },
};

import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/database/client";

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

export type PaginationOptions = { skip: number; take: number };

export type PropertyRepository = {
  findPublishedPage(options: PaginationOptions): Promise<PropertySummaryRecord[]>;
  countPublished(): Promise<number>;
  findPublishedById(propertyId: string): Promise<PropertyDetailRecord | null>;
};

export const propertyRepository: PropertyRepository = {
  findPublishedPage({ skip, take }) {
    return database.property.findMany({
      where: { isPublished: true },
      include: summaryInclude,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    });
  },

  countPublished() {
    return database.property.count({ where: { isPublished: true } });
  },

  findPublishedById(propertyId) {
    return database.property.findFirst({
      where: { id: propertyId, isPublished: true },
      include: detailInclude,
    });
  },
};

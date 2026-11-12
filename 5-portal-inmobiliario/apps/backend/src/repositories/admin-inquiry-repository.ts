import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/database/client";
import { escapeLikePattern, splitSearchTerms } from "@/lib/search";

const adminInquiryInclude = {
  property: { select: { id: true, title: true, deletedAt: true } },
  user: { select: { id: true, name: true } },
} satisfies Prisma.InquiryInclude;

export type AdminInquiryRecord = Prisma.InquiryGetPayload<{
  include: typeof adminInquiryInclude;
}>;

export type AdminInquiryPageOptions = {
  skip: number;
  take: number;
  searchText?: string;
  propertyId?: string;
};

export type AdminInquiryRepository = {
  /** Página de consultas de cualquier propiedad (incluso eliminadas), la más reciente primero. */
  findPage(
    options: AdminInquiryPageOptions,
  ): Promise<{ records: AdminInquiryRecord[]; total: number }>;
};

export const adminInquiryRepository: AdminInquiryRepository = {
  async findPage({ skip, take, searchText, propertyId }) {
    const where: Prisma.InquiryWhereInput = {};
    if (propertyId) where.propertyId = propertyId;

    const terms = splitSearchTerms(searchText ?? "");
    if (terms.length > 0) {
      // unaccent + ILIKE no se expresa en Prisma: se resuelven los ids por SQL.
      const conditions = terms.map((term) => {
        const pattern = `%${escapeLikePattern(term)}%`;
        return Prisma.sql`(unaccent(i."name") ILIKE unaccent(${pattern})
          OR unaccent(i."email") ILIKE unaccent(${pattern})
          OR unaccent(i."message") ILIKE unaccent(${pattern})
          OR unaccent(p."title") ILIKE unaccent(${pattern}))`;
      });
      const rows = await database.$queryRaw<{ id: string }[]>`
        SELECT i."id" FROM "inquiries" i
        JOIN "properties" p ON p."id" = i."propertyId"
        WHERE ${Prisma.join(conditions, " AND ")}`;
      where.id = { in: rows.map((row) => row.id) };
    }

    const [records, total] = await Promise.all([
      database.inquiry.findMany({
        where,
        include: adminInquiryInclude,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip,
        take,
      }),
      database.inquiry.count({ where }),
    ]);
    return { records, total };
  },
};

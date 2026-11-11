import "server-only";
import { database } from "@/lib/database/client";
import { summaryInclude } from "./property-repository";
import { Prisma } from "@/generated/prisma/client";
import { escapeLikePattern, splitSearchTerms } from "@/lib/search";

export type CreateInquiryData = {
  propertyId: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export type InquiryRepository = {
  /** Título de la propiedad si existe y está publicada; null en caso contrario. */
  findPublishedPropertyTitle(propertyId: string): Promise<string | null>;
  create(data: CreateInquiryData): Promise<{ id: string }>;
  /**
   * Página de consultas del usuario sobre propiedades publicadas, la más reciente primero.
   * `searchText` filtra por título de la propiedad o mensaje (sin mayúsculas ni acentos).
   */
  findPageByUser(
    options: UserInquiryPageOptions,
  ): Promise<{ records: UserInquiryRecord[]; total: number }>;
  /** Borra la consulta si pertenece al usuario; false si no existe o es de otra persona. */
  deleteByIdAndUser(inquiryId: string, userId: string): Promise<boolean>;
};

export type UserInquiryPageOptions = {
  userId: string;
  skip: number;
  take: number;
  searchText?: string;
};

const userInquiryInclude = {
  property: { select: { id: true, title: true, images: summaryInclude.images } },
} satisfies Prisma.InquiryInclude;

export type UserInquiryRecord = Prisma.InquiryGetPayload<{ include: typeof userInquiryInclude }>;

export const inquiryRepository: InquiryRepository = {
  async findPublishedPropertyTitle(propertyId) {
    const property = await database.property.findFirst({
      where: { id: propertyId, isPublished: true },
      select: { title: true },
    });
    return property?.title ?? null;
  },

  create(data) {
    return database.inquiry.create({
      data: {
        propertyId: data.propertyId,
        name: data.name,
        email: data.email,
        message: data.message,
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      select: { id: true },
    });
  },

  async findPageByUser({ userId, skip, take, searchText }) {
    const where: Prisma.InquiryWhereInput = { userId, property: { isPublished: true } };

    const terms = splitSearchTerms(searchText ?? "");
    if (terms.length > 0) {
      // unaccent + ILIKE no se expresa en Prisma: se resuelven los ids (siempre del usuario) por SQL.
      const conditions = terms.map((term) => {
        const pattern = `%${escapeLikePattern(term)}%`;
        return Prisma.sql`(unaccent(p."title") ILIKE unaccent(${pattern})
          OR unaccent(i."message") ILIKE unaccent(${pattern}))`;
      });
      const rows = await database.$queryRaw<{ id: string }[]>`
        SELECT i."id" FROM "inquiries" i
        JOIN "properties" p ON p."id" = i."propertyId"
        WHERE i."userId" = ${userId} AND p."isPublished" = true
          AND ${Prisma.join(conditions, " AND ")}`;
      where.id = { in: rows.map((row) => row.id) };
    }

    const [records, total] = await Promise.all([
      database.inquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: userInquiryInclude,
        skip,
        take,
      }),
      database.inquiry.count({ where }),
    ]);
    return { records, total };
  },

  async deleteByIdAndUser(inquiryId, userId) {
    const { count } = await database.inquiry.deleteMany({ where: { id: inquiryId, userId } });
    return count > 0;
  },
};

import "server-only";
import { database } from "@/lib/database/client";
import { summaryInclude, type PropertySummaryRecord } from "./property-repository";

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
  /** Propiedades publicadas sobre las que el usuario consultó, sin repetir, la consulta más reciente primero. */
  listInquiredPropertiesByUser(userId: string): Promise<PropertySummaryRecord[]>;
};

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

  async listInquiredPropertiesByUser(userId) {
    const inquiries = await database.inquiry.findMany({
      where: { userId, property: { isPublished: true } },
      orderBy: { createdAt: "desc" },
      include: { property: { include: summaryInclude } },
    });
    // Varias consultas a la misma propiedad cuentan una vez (la más reciente).
    const propertiesById = new Map<string, PropertySummaryRecord>();
    for (const inquiry of inquiries) {
      if (!propertiesById.has(inquiry.propertyId)) {
        propertiesById.set(inquiry.propertyId, inquiry.property);
      }
    }
    return [...propertiesById.values()];
  },
};

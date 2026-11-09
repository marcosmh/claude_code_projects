import "server-only";
import { database } from "@/lib/database/client";

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
};

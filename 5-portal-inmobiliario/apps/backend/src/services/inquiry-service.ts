import { NotFoundError } from "@/lib/errors";
import type { InquiryRepository } from "@/repositories/inquiry-repository";
import type { InquiryInput, InquiryResponseDto, PropertySummaryDto } from "@portal/shared-types";
import { toSummaryDto } from "./property-service";

/**
 * Registra consultas: valida que la propiedad esté publicada y las persiste en PostgreSQL.
 * El aviso por correo (Web3Forms) lo envía el navegador, porque el plan gratuito rechaza
 * las llamadas desde un servidor.
 */
export function createInquiryService(repository: InquiryRepository) {
  return {
    async submitInquiry(
      input: InquiryInput,
      authenticatedUserId?: string,
    ): Promise<InquiryResponseDto> {
      const propertyTitle = await repository.findPublishedPropertyTitle(input.propertyId);
      if (propertyTitle === null) {
        throw new NotFoundError("Propiedad no encontrada");
      }

      const inquiry = await repository.create({
        propertyId: input.propertyId,
        name: input.name,
        email: input.email,
        message: input.message,
        ...(authenticatedUserId !== undefined && { userId: authenticatedUserId }),
        ...(input.phone !== undefined && { phone: input.phone }),
      });

      return { id: inquiry.id };
    },

    /** Propiedades sobre las que la persona consultó («Propiedades consultadas»). */
    async listInquiredProperties(userId: string): Promise<PropertySummaryDto[]> {
      const records = await repository.listInquiredPropertiesByUser(userId);
      return records.map(toSummaryDto);
    },
  };
}

export type InquiryService = ReturnType<typeof createInquiryService>;

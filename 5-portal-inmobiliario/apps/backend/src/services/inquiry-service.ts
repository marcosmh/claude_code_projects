import { NotFoundError } from "@/lib/errors";
import type { InquiryNotifier } from "@/lib/integrations/web3forms";
import type { InquiryRepository } from "@/repositories/inquiry-repository";
import type { InquiryInput, InquiryResponseDto } from "@portal/shared-types";

type InquiryServiceDependencies = {
  repository: InquiryRepository;
  notifier: InquiryNotifier;
};

/**
 * Registra una consulta: valida que la propiedad esté publicada, la persiste en PostgreSQL
 * y luego la notifica por Web3Forms. Persistir primero evita perder consultas si el envío falla.
 */
export function createInquiryService({ repository, notifier }: InquiryServiceDependencies) {
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

      const notificationSent = await notifier.send({
        name: input.name,
        email: input.email,
        message: input.message,
        propertyId: input.propertyId,
        propertyTitle,
        ...(input.phone !== undefined && { phone: input.phone }),
      });

      return { id: inquiry.id, notificationSent };
    },
  };
}

export type InquiryService = ReturnType<typeof createInquiryService>;

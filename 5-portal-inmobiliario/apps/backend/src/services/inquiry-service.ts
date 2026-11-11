import { NotFoundError } from "@/lib/errors";
import type { InquiryRepository } from "@/repositories/inquiry-repository";
import {
  buildInquirySubject,
  type InquiryInput,
  type InquiryResponseDto,
  type PaginatedResponse,
  type UserInquiryListQuery,
  type UserInquiryDto,
} from "@portal/shared-types";

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

    /** Página de consultas enviadas por la persona («Propiedades consultadas»), la más reciente primero. */
    async listUserInquiries(
      userId: string,
      query: UserInquiryListQuery,
    ): Promise<PaginatedResponse<UserInquiryDto>> {
      const { records, total } = await repository.findPageByUser({
        userId,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        ...(query.q !== undefined && query.q !== "" && { searchText: query.q }),
      });
      return {
        items: records.map((record) => ({
          id: record.id,
          propertyId: record.property.id,
          propertyTitle: record.property.title,
          propertyImageUrl: record.property.images[0]?.url ?? null,
          subject: buildInquirySubject(record.property.title),
          message: record.message,
          createdAt: record.createdAt.toISOString(),
        })),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      };
    },

    /** Elimina una consulta propia; 404 si no existe o es de otra persona. */
    async deleteUserInquiry(userId: string, inquiryId: string): Promise<void> {
      const deleted = await repository.deleteByIdAndUser(inquiryId, userId);
      if (!deleted) {
        throw new NotFoundError("Consulta no encontrada");
      }
    },
  };
}

export type InquiryService = ReturnType<typeof createInquiryService>;

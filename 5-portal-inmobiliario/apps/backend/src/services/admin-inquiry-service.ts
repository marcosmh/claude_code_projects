import type {
  AdminInquiryRecord,
  AdminInquiryRepository,
} from "@/repositories/admin-inquiry-repository";
import type {
  AdminInquiryDto,
  AdminInquiryListQuery,
  PaginatedResponse,
} from "@portal/shared-types";

function toDto(record: AdminInquiryRecord): AdminInquiryDto {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    message: record.message,
    name: record.name,
    email: record.email,
    phone: record.phone,
    propertyId: record.property.id,
    propertyTitle: record.property.title,
    propertyDeleted: record.property.deletedAt !== null,
    userId: record.user?.id ?? null,
    userName: record.user?.name ?? null,
  };
}

/** Consulta de todas las consultas para ADMIN. La autorización se aplica en la ruta con `withRole`. */
export function createAdminInquiryService(repository: AdminInquiryRepository) {
  return {
    async listInquiries(query: AdminInquiryListQuery): Promise<PaginatedResponse<AdminInquiryDto>> {
      const { records, total } = await repository.findPage({
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        ...(query.search !== undefined && { searchText: query.search }),
        ...(query.propertyId !== undefined && { propertyId: query.propertyId }),
      });
      return {
        items: records.map(toDto),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      };
    },
  };
}

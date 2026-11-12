import { NotFoundError } from "@/lib/errors";
import type { AdminPropertyRepository } from "@/repositories/admin-property-repository";
import type { PropertyDetailRecord } from "@/repositories/property-repository";
import type {
  AdminPropertyDto,
  AdminPropertyListItemDto,
  AdminPropertyListQuery,
  PaginatedResponse,
  PropertyInput,
} from "@portal/shared-types";
import { toDetailDto, toSummaryDto } from "./property-service";

function toAdminDto(record: PropertyDetailRecord): AdminPropertyDto {
  return { ...toDetailDto(record), isPublished: record.isPublished };
}

function propertyNotFound(): NotFoundError {
  return new NotFoundError("Propiedad no encontrada");
}

/** CRUD de propiedades para ADMIN. La autorización se aplica en las rutas con `withRole`. */
export function createAdminPropertyService(repository: AdminPropertyRepository) {
  return {
    async listProperties(
      query: AdminPropertyListQuery,
    ): Promise<PaginatedResponse<AdminPropertyListItemDto>> {
      const filters = {
        ...(query.operation !== undefined && { operations: query.operation }),
        ...(query.type !== undefined && { types: query.type }),
        ...(query.availability !== undefined && { availabilities: query.availability }),
        ...(query.minPrice !== undefined && { minPrice: query.minPrice }),
        ...(query.maxPrice !== undefined && { maxPrice: query.maxPrice }),
        ...(query.publishedFrom !== undefined && { publishedFrom: query.publishedFrom }),
        ...(query.publishedTo !== undefined && { publishedTo: query.publishedTo }),
      };
      const { records, total } = await repository.findPage({
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        status: query.status,
        ...(query.search !== undefined && { searchText: query.search }),
        ...(Object.keys(filters).length > 0 && { filters }),
      });
      return {
        items: records.map((record) => ({
          ...toSummaryDto(record),
          isPublished: record.isPublished,
          updatedAt: record.updatedAt.toISOString(),
        })),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      };
    },

    async getProperty(propertyId: string): Promise<AdminPropertyDto> {
      const record = await repository.findById(propertyId);
      if (record === null) throw propertyNotFound();
      return toAdminDto(record);
    },

    async createProperty(input: PropertyInput): Promise<AdminPropertyDto> {
      return toAdminDto(await repository.create(input));
    },

    async updateProperty(propertyId: string, input: PropertyInput): Promise<AdminPropertyDto> {
      const record = await repository.update(propertyId, input);
      if (record === null) throw propertyNotFound();
      return toAdminDto(record);
    },

    async deleteProperty(propertyId: string): Promise<void> {
      const removed = await repository.remove(propertyId);
      if (!removed) throw propertyNotFound();
    },
  };
}

export type AdminPropertyService = ReturnType<typeof createAdminPropertyService>;

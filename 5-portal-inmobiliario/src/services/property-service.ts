import { NotFoundError } from "@/lib/errors";
import type {
  PropertyDetailRecord,
  PropertyRepository,
  PropertySummaryRecord,
} from "@/repositories/property-repository";
import type { PropertyListQuery } from "@/schemas/property-list-query";
import type {
  PaginatedResponse,
  PropertyDetailDto,
  PropertySummaryDto,
} from "@/types/property";

function toNumberOrNull(value: { toNumber(): number } | null): number | null {
  return value === null ? null : value.toNumber();
}

function toSummaryDto(record: PropertySummaryRecord): PropertySummaryDto {
  return {
    id: record.id,
    title: record.title,
    operation: record.operation,
    type: record.type,
    price: record.price.toNumber(),
    currency: record.currency,
    usableArea: toNumberOrNull(record.usableArea),
    bedrooms: record.bedrooms,
    bathrooms: record.bathrooms,
    commune: record.commune,
    city: record.city,
    region: record.region,
    isFeatured: record.isFeatured,
    primaryImageUrl: record.images[0]?.url ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function toDetailDto(record: PropertyDetailRecord): PropertyDetailDto {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    operation: record.operation,
    type: record.type,
    price: record.price.toNumber(),
    currency: record.currency,
    usableArea: toNumberOrNull(record.usableArea),
    totalArea: toNumberOrNull(record.totalArea),
    bedrooms: record.bedrooms,
    bathrooms: record.bathrooms,
    parkingSpots: record.parkingSpots,
    age: record.age,
    address: record.address,
    commune: record.commune,
    city: record.city,
    region: record.region,
    isFeatured: record.isFeatured,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    images: record.images.map((image) => ({
      id: image.id,
      url: image.url,
      position: image.position,
      isPrimary: image.isPrimary,
    })),
    features: record.features.map((feature) => ({
      id: feature.id,
      name: feature.name,
      slug: feature.slug,
    })),
  };
}

export function createPropertyService(repository: PropertyRepository) {
  return {
    async listPublishedProperties(
      query: PropertyListQuery,
    ): Promise<PaginatedResponse<PropertySummaryDto>> {
      const [records, total] = await Promise.all([
        repository.findPublishedPage({
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        repository.countPublished(),
      ]);

      return {
        items: records.map(toSummaryDto),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      };
    },

    async getPublishedPropertyById(propertyId: string): Promise<PropertyDetailDto> {
      const record = await repository.findPublishedById(propertyId);
      if (!record) {
        throw new NotFoundError("Propiedad no encontrada");
      }
      return toDetailDto(record);
    },
  };
}

export type PropertyService = ReturnType<typeof createPropertyService>;

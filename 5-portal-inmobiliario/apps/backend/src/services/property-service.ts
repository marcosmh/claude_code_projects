import { NotFoundError } from "@/lib/errors";
import type {
  PropertyDetailRecord,
  PropertyFilters,
  PropertyRepository,
  PropertySummaryRecord,
} from "@/repositories/property-repository";
import type { PropertyListQuery } from "@portal/shared-types";
import type {
  PaginatedResponse,
  PropertyDetailDto,
  PropertySummaryDto,
} from "@portal/shared-types";

function toNumberOrNull(value: { toNumber(): number } | null): number | null {
  return value === null ? null : value.toNumber();
}

export function toSummaryDto(record: PropertySummaryRecord): PropertySummaryDto {
  return {
    id: record.id,
    title: record.title,
    operation: record.operation,
    type: record.type,
    price: record.price.toNumber(),
    currency: record.currency,
    availability: record.availability,
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

export function toDetailDto(record: PropertyDetailRecord): PropertyDetailDto {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    operation: record.operation,
    type: record.type,
    price: record.price.toNumber(),
    currency: record.currency,
    availability: record.availability,
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
      const filters: PropertyFilters = {
        searchText: query.search,
        operations: query.operation,
        types: query.type,
        availabilities: query.availability,
        publishedFrom: query.publishedFrom,
        publishedTo: query.publishedTo,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        minBedrooms: query.bedrooms,
        minBathrooms: query.bathrooms,
        minUsableArea: query.minUsableArea,
        commune: query.commune,
        city: query.city,
        region: query.region,
        isFeatured: query.featured,
      };
      const { records, total } = await repository.findPublishedPage({
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        filters,
        sort: query.sort,
      });

      return {
        items: records.map(toSummaryDto),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      };
    },

    /** Ciudades y regiones con propiedades publicadas, para los filtros de selección única. */
    listPublishedLocations() {
      return repository.findPublishedLocations();
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

import { describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
import { NotFoundError } from "@/lib/errors";
import type {
  PropertyDetailRecord,
  PropertyRepository,
  PropertySummaryRecord,
} from "@/repositories/property-repository";
import { createPropertyService } from "./property-service";

const baseDate = new Date("2026-01-15T10:00:00.000Z");

function buildSummaryRecord(
  overrides: Partial<PropertySummaryRecord> = {},
): PropertySummaryRecord {
  return {
    id: "prop-1",
    title: "Casa de prueba",
    description: "Descripción",
    operation: "SALE",
    type: "HOUSE",
    price: new Decimal("4850000.00"),
    currency: "MXN",
    usableArea: new Decimal("210.50"),
    totalArea: null,
    bedrooms: 4,
    bathrooms: 3,
    parkingSpots: 2,
    age: 3,
    address: "Calle 1",
    commune: "Centro",
    city: "Querétaro",
    region: "Querétaro",
    isPublished: true,
    isFeatured: false,
    createdAt: baseDate,
    updatedAt: baseDate,
    images: [{ url: "https://example.com/main.jpg" }],
    ...overrides,
  };
}

function buildDetailRecord(
  overrides: Partial<PropertyDetailRecord> = {},
): PropertyDetailRecord {
  return {
    ...buildSummaryRecord(),
    totalArea: new Decimal("280.00"),
    images: [
      {
        id: "img-1",
        propertyId: "prop-1",
        url: "https://example.com/1.jpg",
        publicId: "p1",
        position: 0,
        isPrimary: true,
        createdAt: baseDate,
      },
    ],
    features: [{ id: "f-1", name: "Piscina", slug: "piscina", createdAt: baseDate }],
    ...overrides,
  };
}

function buildRepository(overrides: Partial<PropertyRepository> = {}): PropertyRepository {
  return {
    findPublishedPage: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    findPublishedById: vi.fn().mockResolvedValue(null),
    findPublishedLocations: vi.fn().mockResolvedValue({ cities: [], regions: [] }),
    ...overrides,
  };
}

describe("listPublishedProperties", () => {
  it("convierte decimales a números y expone la imagen principal", async () => {
    const service = createPropertyService(
      buildRepository({
        findPublishedPage: vi
          .fn()
          .mockResolvedValue({ records: [buildSummaryRecord()], total: 1 }),
      }),
    );

    const result = await service.listPublishedProperties({ page: 1, pageSize: 12, sort: "newest" });

    expect(result.items[0]).toMatchObject({
      id: "prop-1",
      price: 4850000,
      usableArea: 210.5,
      primaryImageUrl: "https://example.com/main.jpg",
      createdAt: "2026-01-15T10:00:00.000Z",
    });
    expect(result.items[0]).not.toHaveProperty("description");
    expect(result.items[0]).not.toHaveProperty("isPublished");
  });

  it("devuelve primaryImageUrl nulo cuando no hay imagen principal", async () => {
    const service = createPropertyService(
      buildRepository({
        findPublishedPage: vi.fn().mockResolvedValue({
          records: [buildSummaryRecord({ images: [], usableArea: null })],
          total: 1,
        }),
      }),
    );
    const result = await service.listPublishedProperties({ page: 1, pageSize: 12, sort: "newest" });
    expect(result.items[0].primaryImageUrl).toBeNull();
    expect(result.items[0].usableArea).toBeNull();
  });

  it("calcula skip/take y metadatos de paginación", async () => {
    const findPublishedPage = vi.fn().mockResolvedValue({ records: [], total: 25 });
    const service = createPropertyService(buildRepository({ findPublishedPage }));

    const result = await service.listPublishedProperties({ page: 3, pageSize: 10, sort: "newest" });

    expect(findPublishedPage).toHaveBeenCalledWith({ skip: 20, take: 10, filters: {}, sort: "newest" });
    expect(result).toMatchObject({ page: 3, pageSize: 10, total: 25, totalPages: 3 });
  });
});

describe("listPublishedProperties con filtros", () => {
  it("traduce operation y featured a filtros del repositorio", async () => {
    const findPublishedPage = vi.fn().mockResolvedValue({ records: [], total: 0 });
    const service = createPropertyService(buildRepository({ findPublishedPage }));

    await service.listPublishedProperties({
      page: 1,
      pageSize: 3,
      search: "querétaro",
      operation: ["RENT", "SALE"],
      type: ["HOUSE"],
      featured: true,
      sort: "price_desc",
    });

    const expectedFilters = {
      searchText: "querétaro",
      operations: ["RENT", "SALE"],
      types: ["HOUSE"],
      isFeatured: true,
    };
    expect(findPublishedPage).toHaveBeenCalledWith({
      skip: 0,
      take: 3,
      filters: expectedFilters,
      sort: "price_desc",
    });
  });
});

describe("getPublishedPropertyById", () => {
  it("devuelve el detalle completo con imágenes y características", async () => {
    const service = createPropertyService(
      buildRepository({ findPublishedById: vi.fn().mockResolvedValue(buildDetailRecord()) }),
    );

    const detail = await service.getPublishedPropertyById("prop-1");

    expect(detail).toMatchObject({
      id: "prop-1",
      description: "Descripción",
      totalArea: 280,
      address: "Calle 1",
      features: [{ id: "f-1", name: "Piscina", slug: "piscina" }],
    });
    expect(detail.images[0]).toEqual({
      id: "img-1",
      url: "https://example.com/1.jpg",
      position: 0,
      isPrimary: true,
    });
    expect(detail.images[0]).not.toHaveProperty("publicId");
  });

  it("lanza NotFoundError si no existe o no está publicada", async () => {
    const service = createPropertyService(buildRepository());
    await expect(service.getPublishedPropertyById("x")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("listPublishedLocations", () => {
  it("devuelve las ciudades y regiones del repositorio", async () => {
    const locations = { cities: ["Mérida"], regions: ["Yucatán"] };
    const service = createPropertyService(
      buildRepository({ findPublishedLocations: vi.fn().mockResolvedValue(locations) }),
    );
    expect(await service.listPublishedLocations()).toEqual(locations);
  });
});


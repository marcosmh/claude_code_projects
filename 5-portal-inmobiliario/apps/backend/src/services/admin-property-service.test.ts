import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";
import type { AdminPropertyRepository } from "@/repositories/admin-property-repository";
import type { PropertySummaryRecord } from "@/repositories/property-repository";
import type { PropertyInput } from "@portal/shared-types";
import { createAdminPropertyService } from "./admin-property-service";

const decimal = (value: number) => ({ toNumber: () => value });

function buildRecord(id: string, isPublished = false) {
  return {
    id,
    title: `Propiedad ${id}`,
    description: "Descripción",
    operation: "SALE",
    type: "HOUSE",
    price: decimal(1500000),
    currency: "MXN",
    usableArea: null,
    totalArea: null,
    bedrooms: null,
    bathrooms: null,
    parkingSpots: null,
    age: null,
    address: "Calle 1",
    commune: "Roma",
    city: "CDMX",
    region: "CDMX",
    isPublished,
    isFeatured: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
    images: [],
    features: [],
  };
}

const input = { title: "Casa nueva" } as unknown as PropertyInput;

function buildRepository(
  overrides: Partial<AdminPropertyRepository> = {},
): AdminPropertyRepository {
  return {
    findPage: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    findById: vi.fn().mockResolvedValue(buildRecord("p1")),
    create: vi.fn().mockResolvedValue(buildRecord("p1")),
    update: vi.fn().mockResolvedValue(buildRecord("p1")),
    remove: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("listProperties", () => {
  it("pagina, pasa el filtro y marca el estado de publicación", async () => {
    const repository = buildRepository({
      findPage: vi.fn().mockResolvedValue({
        records: [buildRecord("p2", true), buildRecord("p1")] as unknown as PropertySummaryRecord[],
        total: 12,
      }),
    });
    const result = await createAdminPropertyService(repository).listProperties({
      page: 2,
      pageSize: 10,
      status: "draft",
      search: "casa",
    });

    expect(repository.findPage).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      status: "draft",
      searchText: "casa",
    });
    expect(result).toMatchObject({ page: 2, total: 12, totalPages: 2 });
    expect(result.items.map((item) => [item.id, item.isPublished])).toEqual([
      ["p2", true],
      ["p1", false],
    ]);
    expect(result.items[0]?.updatedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("no envía texto de búsqueda si no hay", async () => {
    const repository = buildRepository();
    await createAdminPropertyService(repository).listProperties({
      page: 1,
      pageSize: 10,
      status: "all",
    });
    expect(repository.findPage).toHaveBeenCalledWith({ skip: 0, take: 10, status: "all" });
  });
});

describe("getProperty", () => {
  it("devuelve la propiedad con su estado de publicación", async () => {
    const dto = await createAdminPropertyService(buildRepository()).getProperty("p1");
    expect(dto).toMatchObject({ id: "p1", price: 1500000, isPublished: false });
  });

  it("lanza NotFoundError si no existe", async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    await expect(createAdminPropertyService(repository).getProperty("x")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("createProperty / updateProperty / deleteProperty", () => {
  it("crea y devuelve la propiedad", async () => {
    const repository = buildRepository();
    const dto = await createAdminPropertyService(repository).createProperty(input);
    expect(repository.create).toHaveBeenCalledWith(input);
    expect(dto.id).toBe("p1");
  });

  it("actualiza o lanza NotFoundError", async () => {
    const service = createAdminPropertyService(buildRepository());
    expect((await service.updateProperty("p1", input)).id).toBe("p1");

    const missing = createAdminPropertyService(
      buildRepository({ update: vi.fn().mockResolvedValue(null) }),
    );
    await expect(missing.updateProperty("x", input)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("elimina o lanza NotFoundError", async () => {
    await expect(
      createAdminPropertyService(buildRepository()).deleteProperty("p1"),
    ).resolves.toBeUndefined();
    const missing = createAdminPropertyService(
      buildRepository({ remove: vi.fn().mockResolvedValue(false) }),
    );
    await expect(missing.deleteProperty("x")).rejects.toBeInstanceOf(NotFoundError);
  });
});

import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";
import type { FavoriteRepository } from "@/repositories/favorite-repository";
import type { PropertySummaryRecord } from "@/repositories/property-repository";
import { createFavoriteService } from "./favorite-service";

function buildRecord(id: string): PropertySummaryRecord {
  return {
    id,
    title: `Propiedad ${id}`,
    description: "Descripción",
    operation: "SALE",
    type: "HOUSE",
    price: { toNumber: () => 1500000 },
    currency: "MXN",
    usableArea: null,
    totalArea: null,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpots: null,
    age: null,
    address: "Calle 1",
    commune: "Roma Norte",
    city: "Ciudad de México",
    region: "Ciudad de México",
    isFeatured: false,
    isPublished: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    images: [{ url: "https://img.example/1.jpg" }],
  } as unknown as PropertySummaryRecord;
}

function buildRepository(overrides: Partial<FavoriteRepository> = {}): FavoriteRepository {
  return {
    listByUser: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(buildRecord("p1")),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("favoriteService", () => {
  it("lista las favoritas del usuario como resúmenes", async () => {
    const repository = buildRepository({
      listByUser: vi.fn().mockResolvedValue([buildRecord("p2"), buildRecord("p1")]),
    });
    const favorites = await createFavoriteService(repository).listFavorites("u1");

    expect(repository.listByUser).toHaveBeenCalledWith("u1");
    expect(favorites.map((favorite) => favorite.id)).toEqual(["p2", "p1"]);
    expect(favorites[0]).toMatchObject({
      price: 1500000,
      primaryImageUrl: "https://img.example/1.jpg",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("guarda una propiedad y devuelve su resumen", async () => {
    const repository = buildRepository();
    const property = await createFavoriteService(repository).addFavorite("u1", "p1");

    expect(repository.add).toHaveBeenCalledWith("u1", "p1");
    expect(property.id).toBe("p1");
  });

  it("lanza NotFoundError si la propiedad no existe o no está publicada", async () => {
    const service = createFavoriteService(
      buildRepository({ add: vi.fn().mockResolvedValue(null) }),
    );
    await expect(service.addFavorite("u1", "nada")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("quita una propiedad de favoritos", async () => {
    const repository = buildRepository();
    await createFavoriteService(repository).removeFavorite("u1", "p1");
    expect(repository.remove).toHaveBeenCalledWith("u1", "p1");
  });
});

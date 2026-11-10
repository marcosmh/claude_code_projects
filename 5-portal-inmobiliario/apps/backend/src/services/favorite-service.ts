import { NotFoundError } from "@/lib/errors";
import type { FavoriteRepository } from "@/repositories/favorite-repository";
import type { PropertySummaryDto } from "@portal/shared-types";
import { toSummaryDto } from "./property-service";

export function createFavoriteService(repository: FavoriteRepository) {
  return {
    async listFavorites(userId: string): Promise<PropertySummaryDto[]> {
      const records = await repository.listByUser(userId);
      return records.map(toSummaryDto);
    },

    /** Idempotente: guardar dos veces la misma propiedad no la duplica. */
    async addFavorite(userId: string, propertyId: string): Promise<PropertySummaryDto> {
      const record = await repository.add(userId, propertyId);
      if (record === null) throw new NotFoundError("Propiedad no encontrada");
      return toSummaryDto(record);
    },

    async removeFavorite(userId: string, propertyId: string): Promise<void> {
      await repository.remove(userId, propertyId);
    },
  };
}

export type FavoriteService = ReturnType<typeof createFavoriteService>;

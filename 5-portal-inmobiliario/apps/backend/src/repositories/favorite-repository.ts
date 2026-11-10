import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/database/client";
import { summaryInclude, type PropertySummaryRecord } from "./property-repository";

export type FavoriteRepository = {
  /** Propiedades publicadas que la persona guardó, la más reciente primero. */
  listByUser(userId: string): Promise<PropertySummaryRecord[]>;
  /**
   * Guarda la propiedad sin duplicar (repetirlo no cambia nada). Devuelve la propiedad, o null si
   * no existe o no está publicada.
   */
  add(userId: string, propertyId: string): Promise<PropertySummaryRecord | null>;
  /** Quita la propiedad de favoritos; no falla si no estaba guardada. */
  remove(userId: string, propertyId: string): Promise<void>;
};

export const favoriteRepository: FavoriteRepository = {
  async listByUser(userId) {
    const favorites = await database.favorite.findMany({
      where: { userId, property: { isPublished: true } },
      orderBy: { createdAt: "desc" },
      include: { property: { include: summaryInclude } },
    });
    return favorites.map((favorite) => favorite.property);
  },

  async add(userId, propertyId) {
    const property = await database.property.findFirst({
      where: { id: propertyId, isPublished: true },
      include: summaryInclude,
    });
    if (property === null) return null;

    try {
      await database.favorite.create({ data: { userId, propertyId } });
    } catch (error) {
      // La restricción única (userId, propertyId) resuelve la carrera entre dos solicitudes
      // simultáneas: la propiedad ya estaba guardada, que es el resultado esperado.
      const isDuplicate =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!isDuplicate) throw error;
    }
    return property;
  },

  async remove(userId, propertyId) {
    await database.favorite.deleteMany({ where: { userId, propertyId } });
  },
};

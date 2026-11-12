import "server-only";
import { Prisma, type Feature } from "@/generated/prisma/client";
import { database } from "@/lib/database/client";
import { ConflictError } from "@/lib/errors";

export type FeatureRepository = {
  findAll(): Promise<Feature[]>;
  /** Lanza ConflictError si el nombre o el slug ya existen. */
  create(data: { name: string; slug: string }): Promise<Feature>;
  /** Ids que existen de entre los indicados. */
  findExistingIds(featureIds: string[]): Promise<string[]>;
  /** Reemplaza las características de la propiedad y devuelve el conjunto resultante. */
  setForProperty(propertyId: string, featureIds: string[]): Promise<Feature[]>;
};

export const featureRepository: FeatureRepository = {
  findAll() {
    return database.feature.findMany({ orderBy: { name: "asc" } });
  },

  async create(data) {
    try {
      return await database.feature.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Ya existe una característica con ese nombre");
      }
      throw error;
    }
  },

  async findExistingIds(featureIds) {
    const rows = await database.feature.findMany({
      where: { id: { in: featureIds } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async setForProperty(propertyId, featureIds) {
    const property = await database.property.update({
      where: { id: propertyId },
      data: { features: { set: featureIds.map((id) => ({ id })) } },
      include: { features: { orderBy: { name: "asc" } } },
    });
    return property.features;
  },
};

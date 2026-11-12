import "server-only";
import type { PropertyImage } from "@/generated/prisma/client";
import { database } from "@/lib/database/client";

export type PropertyImageRepository = {
  /**
   * Agrega una imagen al final de la propiedad; la primera queda como principal.
   * La posición y la marca de principal se calculan dentro de una transacción.
   */
  create(propertyId: string, image: { url: string; publicId: string }): Promise<PropertyImage>;
  /** Imagen de esa propiedad, o null si no existe o pertenece a otra. */
  findOwned(propertyId: string, imageId: string): Promise<PropertyImage | null>;
  /** Imágenes de la propiedad por posición. */
  findByProperty(propertyId: string): Promise<PropertyImage[]>;
  /**
   * Elimina la fila y deja la propiedad coherente: posiciones 0, 1, 2… y, si era la principal,
   * la primera imagen restante pasa a serlo.
   */
  remove(propertyId: string, imageId: string): Promise<void>;
  /** Marca la imagen como la única principal. */
  setPrimary(propertyId: string, imageId: string): Promise<void>;
  /** Asigna la posición según el orden de `imageIds` (el servicio garantiza que son todas). */
  reorder(propertyId: string, imageIds: string[]): Promise<void>;
};

export const propertyImageRepository: PropertyImageRepository = {
  create(propertyId, { url, publicId }) {
    return database.$transaction(async (transaction) => {
      const lastImage = await transaction.propertyImage.findFirst({
        where: { propertyId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const primaryCount = await transaction.propertyImage.count({
        where: { propertyId, isPrimary: true },
      });
      return transaction.propertyImage.create({
        data: {
          propertyId,
          url,
          publicId,
          position: (lastImage?.position ?? -1) + 1,
          isPrimary: primaryCount === 0,
        },
      });
    });
  },

  findOwned(propertyId, imageId) {
    return database.propertyImage.findFirst({ where: { id: imageId, propertyId } });
  },

  findByProperty(propertyId) {
    return database.propertyImage.findMany({
      where: { propertyId },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
  },

  async remove(propertyId, imageId) {
    await database.$transaction(async (transaction) => {
      await transaction.propertyImage.deleteMany({ where: { id: imageId, propertyId } });
      const remaining = await transaction.propertyImage.findMany({
        where: { propertyId },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true, isPrimary: true },
      });
      const needsPrimary = remaining.length > 0 && !remaining.some((image) => image.isPrimary);
      for (const [index, image] of remaining.entries()) {
        await transaction.propertyImage.update({
          where: { id: image.id },
          data: { position: index, ...(needsPrimary && index === 0 && { isPrimary: true }) },
        });
      }
    });
  },

  async setPrimary(propertyId, imageId) {
    await database.$transaction([
      database.propertyImage.updateMany({
        where: { propertyId, isPrimary: true, id: { not: imageId } },
        data: { isPrimary: false },
      }),
      database.propertyImage.updateMany({
        where: { id: imageId, propertyId },
        data: { isPrimary: true },
      }),
    ]);
  },

  async reorder(propertyId, imageIds) {
    await database.$transaction(
      imageIds.map((imageId, index) =>
        database.propertyImage.updateMany({
          where: { id: imageId, propertyId },
          data: { position: index },
        }),
      ),
    );
  },
};

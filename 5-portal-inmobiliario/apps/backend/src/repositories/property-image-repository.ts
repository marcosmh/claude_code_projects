import "server-only";
import type { PropertyImage } from "@/generated/prisma/client";
import { database } from "@/lib/database/client";

export type PropertyImageRepository = {
  /**
   * Agrega una imagen al final de la propiedad; la primera queda como principal.
   * La posición y la marca de principal se calculan dentro de una transacción.
   */
  create(propertyId: string, image: { url: string; publicId: string }): Promise<PropertyImage>;
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
};

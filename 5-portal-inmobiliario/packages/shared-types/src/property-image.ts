/** Tamaño máximo de una imagen de propiedad (5 MB). */
export const PROPERTY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Tipos de imagen permitidos al subir fotos de propiedades. */
export const propertyImageContentTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type PropertyImageContentType = (typeof propertyImageContentTypes)[number];

import { z } from "zod";

/** Cuerpo de PUT /api/admin/properties/{id}/images: ids de todas las imágenes en el orden deseado. */
export const reorderImagesInputSchema = z.object({
  imageIds: z
    .array(z.string().min(1, "Id de imagen no válido"))
    .min(1, "Indica al menos una imagen")
    .max(50, "Máximo 50 imágenes"),
});
export type ReorderImagesInput = z.output<typeof reorderImagesInputSchema>;

/** Cuerpo de PATCH /api/admin/properties/{id}/images/{imageId}: solo se puede marcar como principal. */
export const setPrimaryImageInputSchema = z.object({
  isPrimary: z.literal(true, { error: "Solo se admite isPrimary: true" }),
});
export type SetPrimaryImageInput = z.output<typeof setPrimaryImageInputSchema>;

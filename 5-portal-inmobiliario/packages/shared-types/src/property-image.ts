/** Tamaño máximo de una imagen de propiedad (5 MB). */
export const PROPERTY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Tipos de imagen permitidos al subir fotos de propiedades. */
export const propertyImageContentTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type PropertyImageContentType = (typeof propertyImageContentTypes)[number];

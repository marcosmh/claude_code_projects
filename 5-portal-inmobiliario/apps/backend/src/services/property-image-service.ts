import {
  NotFoundError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "@/lib/errors";
import type { ImageStorage, ImageUpload } from "@/lib/cloudinary/cloudinary-storage";
import type { AdminPropertyRepository } from "@/repositories/admin-property-repository";
import type { PropertyImageRepository } from "@/repositories/property-image-repository";
import {
  PROPERTY_IMAGE_MAX_BYTES,
  propertyImageContentTypes,
  type PropertyImageContentType,
  type PropertyImageDto,
} from "@portal/shared-types";

type PropertyImageServiceDependencies = {
  properties: Pick<AdminPropertyRepository, "findById">;
  images: PropertyImageRepository;
  storage: ImageStorage;
};

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, index) => bytes[offset + index] === value);

/** Tipo real según los primeros bytes (no se confía solo en el `Content-Type` declarado). */
export function detectImageContentType(bytes: Uint8Array): PropertyImageContentType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // WebP: "RIFF" + tamaño (4 bytes) + "WEBP".
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

/** Subida de imágenes de propiedades (solo ADMIN, autorizado en la ruta). */
export function createPropertyImageService({
  properties,
  images,
  storage,
}: PropertyImageServiceDependencies) {
  return {
    async uploadImage(propertyId: string, file: ImageUpload): Promise<PropertyImageDto> {
      if (!(await properties.findById(propertyId))) {
        throw new NotFoundError("Propiedad no encontrada");
      }
      if (file.bytes.length === 0) throw new ValidationError("El archivo está vacío");
      if (file.bytes.length > PROPERTY_IMAGE_MAX_BYTES) {
        throw new PayloadTooLargeError(
          `La imagen supera el máximo de ${PROPERTY_IMAGE_MAX_BYTES / (1024 * 1024)} MB`,
        );
      }
      const detectedType = detectImageContentType(file.bytes);
      const isAllowedType = (propertyImageContentTypes as readonly string[]).includes(
        file.contentType,
      );
      if (!isAllowedType || detectedType !== file.contentType) {
        throw new UnsupportedMediaTypeError("Solo se permiten imágenes JPEG, PNG o WebP");
      }

      const stored = await storage.upload(file);
      try {
        const record = await images.create(propertyId, stored);
        return {
          id: record.id,
          url: record.url,
          position: record.position,
          isPrimary: record.isPrimary,
        };
      } catch (error) {
        // Mantiene sincronizados Cloudinary y PostgreSQL: no deja archivos huérfanos.
        await storage.remove(stored.publicId).catch((removeError: unknown) => {
          console.error("No se pudo eliminar la imagen huérfana de Cloudinary:", removeError);
        });
        throw error;
      }
    },
  };
}

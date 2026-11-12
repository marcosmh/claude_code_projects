import {
  NotFoundError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "@/lib/errors";
import type { ImageStorage, ImageUpload } from "@/lib/cloudinary/cloudinary-storage";
import type { AdminPropertyRepository } from "@/repositories/admin-property-repository";
import type { PropertyImageRepository } from "@/repositories/property-image-repository";
import type { PropertyImage } from "@/generated/prisma/client";
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

function toDto(record: PropertyImage): PropertyImageDto {
  return { id: record.id, url: record.url, position: record.position, isPrimary: record.isPrimary };
}

/** Administración de imágenes de propiedades (solo ADMIN, autorizado en la ruta). */
export function createPropertyImageService({
  properties,
  images,
  storage,
}: PropertyImageServiceDependencies) {
  async function requireProperty(propertyId: string): Promise<void> {
    if (!(await properties.findById(propertyId))) {
      throw new NotFoundError("Propiedad no encontrada");
    }
  }

  async function requireImage(propertyId: string, imageId: string): Promise<PropertyImage> {
    await requireProperty(propertyId);
    const image = await images.findOwned(propertyId, imageId);
    if (!image) throw new NotFoundError("Imagen no encontrada");
    return image;
  }

  return {
    async uploadImage(propertyId: string, file: ImageUpload): Promise<PropertyImageDto> {
      await requireProperty(propertyId);
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
        return toDto(record);
      } catch (error) {
        // Mantiene sincronizados Cloudinary y PostgreSQL: no deja archivos huérfanos.
        await storage.remove(stored.publicId).catch((removeError: unknown) => {
          console.error("No se pudo eliminar la imagen huérfana de Cloudinary:", removeError);
        });
        throw error;
      }
    },

    /**
     * Elimina la imagen de Cloudinary y luego de PostgreSQL. Si Cloudinary falla no cambia nada;
     * repetir la operación es seguro porque Cloudinary acepta que la imagen ya no exista.
     */
    async deleteImage(propertyId: string, imageId: string): Promise<void> {
      const image = await requireImage(propertyId, imageId);
      await storage.remove(image.publicId);
      await images.remove(propertyId, imageId);
    },

    /** Marca la imagen como la principal y devuelve la lista actualizada. */
    async setPrimaryImage(propertyId: string, imageId: string): Promise<PropertyImageDto[]> {
      await requireImage(propertyId, imageId);
      await images.setPrimary(propertyId, imageId);
      return (await images.findByProperty(propertyId)).map(toDto);
    },

    /** Reordena las imágenes: `imageIds` debe contener exactamente las de la propiedad, sin repetir. */
    async reorderImages(propertyId: string, imageIds: string[]): Promise<PropertyImageDto[]> {
      await requireProperty(propertyId);
      const current = await images.findByProperty(propertyId);
      const currentIds = new Set(current.map((image) => image.id));
      const requestedIds = new Set(imageIds);
      const isSameSet =
        requestedIds.size === imageIds.length &&
        requestedIds.size === currentIds.size &&
        imageIds.every((imageId) => currentIds.has(imageId));
      if (!isSameSet) {
        throw new ValidationError(
          "La lista debe incluir exactamente las imágenes de la propiedad, sin repetir",
        );
      }
      await images.reorder(propertyId, imageIds);
      return (await images.findByProperty(propertyId)).map(toDto);
    },
  };
}

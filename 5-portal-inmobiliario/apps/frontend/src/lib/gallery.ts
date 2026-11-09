import type { PropertyImageDto } from "@portal/shared-types";

/** Imagen principal primero y el resto por posición. */
export function sortGalleryImages(images: PropertyImageDto[]): PropertyImageDto[] {
  return [...images].sort((first, second) => {
    if (first.isPrimary !== second.isPrimary) return first.isPrimary ? -1 : 1;
    return first.position - second.position;
  });
}

/** Navegación circular: después de la última vuelve a la primera y viceversa. */
export function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

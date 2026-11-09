"use client";

import Image from "next/image";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { sortGalleryImages, wrapIndex } from "@/lib/gallery";
import type { PropertyImageDto } from "@portal/shared-types";

type PropertyGalleryProps = {
  images: PropertyImageDto[];
  propertyTitle: string;
  /** Contenido superpuesto sobre la imagen principal (p. ej. la insignia de operación). */
  overlay?: ReactNode;
};

const controlClassName =
  "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-lg font-bold shadow hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Galería con imagen principal, miniaturas y navegación por botones, teclado y miniaturas. */
export function PropertyGallery({ images, propertyTitle, overlay }: PropertyGalleryProps) {
  const galleryImages = sortGalleryImages(images);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const total = galleryImages.length;
  const currentIndex = Math.min(selectedIndex, Math.max(total - 1, 0));
  const currentImage = galleryImages[currentIndex];

  const goTo = (index: number) => setSelectedIndex(wrapIndex(index, total));

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(currentIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(currentIndex - 1);
    }
  };

  return (
    <section
      aria-roledescription="carrusel"
      aria-label={`Galería de ${propertyTitle}`}
      onKeyDown={handleKeyDown}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-foreground/5 sm:aspect-[16/9]">
        {currentImage && (
          <Image
            key={currentImage.id}
            src={currentImage.url}
            alt={`Fotografía ${currentIndex + 1} de ${total} de ${propertyTitle}`}
            fill
            priority={currentIndex === 0}
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="object-cover"
          />
        )}
        {overlay}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={() => goTo(currentIndex - 1)}
              className={cn(controlClassName, "left-3")}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              onClick={() => goTo(currentIndex + 1)}
              className={cn(controlClassName, "right-3")}
            >
              <span aria-hidden="true">›</span>
            </button>
            <p
              aria-live="polite"
              className="absolute bottom-3 right-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold"
            >
              {currentIndex + 1} de {total}
            </p>
          </>
        )}
      </div>

      {total > 1 && (
        <ul aria-label="Miniaturas" className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {galleryImages.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                aria-label={`Ver fotografía ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative block h-16 w-24 overflow-hidden rounded-md border-2 bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-20 sm:w-28",
                  index === currentIndex
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={image.url} alt="" fill sizes="112px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

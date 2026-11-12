import Image from "next/image";
import { imageLoaderFor } from "@/lib/image-loader";
import Link from "next/link";
import { memo } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import {
  formatArea,
  formatAvailability,
  formatBathrooms,
  formatOperation,
  formatPrice,
  formatPropertyType,
} from "@/lib/format";
import type { PropertySummaryDto } from "@portal/shared-types";

type PropertyCardProps = {
  property: PropertySummaryDto;
  /** Carga la imagen con prioridad: solo para tarjetas visibles al cargar (posibles LCP). */
  priority?: boolean;
  /** Nivel del título para respetar la jerarquía de la página (h2 en el catálogo, h3 bajo secciones). */
  headingLevel?: "h2" | "h3";
};

/** Tarjeta reutilizable de propiedad para landing, catálogo y resultados de búsqueda. */
/**
 * Memoizada: al abrir/cerrar el panel de filtros o cambiar el orden, el catálogo se vuelve a
 * renderizar pero las tarjetas con el mismo `property` no.
 */
export const PropertyCard = memo(function PropertyCard({
  property,
  priority = false,
  headingLevel: Heading = "h3",
}: PropertyCardProps) {
  const specifications = [
    property.bedrooms !== null &&
      `${property.bedrooms} ${property.bedrooms === 1 ? "dorm." : "dorms."}`,
    property.bathrooms !== null && formatBathrooms(property.bathrooms),
    property.usableArea !== null && formatArea(property.usableArea),
  ].filter(Boolean);

  return (
    <article className="relative h-full overflow-hidden rounded-xl border border-foreground/10 bg-surface shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
      <Link
        href={`/properties/${property.id}`}
        className="flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="relative aspect-[3/2] bg-foreground/5">
          {property.primaryImageUrl && (
            <Image
              src={property.primaryImageUrl}
              loader={imageLoaderFor(property.primaryImageUrl)}
              alt={`Fotografía de ${property.title}`}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-badge px-3 py-1 text-xs font-semibold text-badge-foreground">
            {formatOperation(property.operation)}
          </span>
          {property.availability !== "AVAILABLE" && (
            <span className="absolute bottom-3 left-3 rounded-full bg-warning-surface px-3 py-1 text-xs font-semibold text-warning">
              {formatAvailability(property.availability)}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="text-xl font-bold tabular-nums">
            {formatPrice(property.price, property.currency, property.operation)}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-foreground/70">
            {formatPropertyType(property.type)}
          </p>
          <Heading className="mt-1 line-clamp-2 font-medium break-words">{property.title}</Heading>
          <p className="mt-1 break-words text-sm text-foreground/70">
            {property.commune}, {property.city}
          </p>
          {specifications.length > 0 && (
            <ul
              aria-label="Características"
              className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-sm text-foreground/70"
            >
              {specifications.map((specification) => (
                <li key={specification as string}>{specification}</li>
              ))}
            </ul>
          )}
        </div>
      </Link>
      {/* Hermano del enlace (no dentro): un botón anidado en un <a> no es HTML válido ni accesible. */}
      <FavoriteButton
        propertyId={property.id}
        propertyTitle={property.title}
        className="absolute right-3 top-3"
      />
    </article>
  );
});

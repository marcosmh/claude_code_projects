import Image from "next/image";
import Link from "next/link";
import { formatArea, formatBathrooms, formatPrice } from "@/lib/format";
import type { PropertySummaryDto } from "@portal/shared-types";

const operationLabel = { SALE: "Venta", RENT: "Arriendo" } as const;

/** Tarjeta mínima de la landing. El Paso 8 la reemplaza por el PropertyCard reutilizable. */
export function LandingPropertyCard({ property }: { property: PropertySummaryDto }) {
  const specifications = [
    property.bedrooms !== null && `${property.bedrooms} dorm.`,
    property.bathrooms !== null && formatBathrooms(property.bathrooms),
    property.usableArea !== null && formatArea(property.usableArea),
  ].filter(Boolean);

  return (
    <article className="overflow-hidden rounded-xl border border-foreground/10 bg-surface shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
      <Link
        href={`/properties/${property.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="relative aspect-[3/2] bg-foreground/5">
          {property.primaryImageUrl && (
            <Image
              src={property.primaryImageUrl}
              alt={`Fotografía de ${property.title}`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-badge px-3 py-1 text-xs font-semibold text-badge-foreground">
            {operationLabel[property.operation]}
          </span>
        </div>
        <div className="p-4">
          <p className="text-xl font-bold">
            {formatPrice(property.price, property.currency, property.operation)}
          </p>
          <h3 className="mt-1 line-clamp-2 font-medium">{property.title}</h3>
          <p className="mt-1 text-sm text-foreground/70">
            {property.commune}, {property.city}
          </p>
          {specifications.length > 0 && (
            <p className="mt-3 text-sm text-foreground/70">{specifications.join(" · ")}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

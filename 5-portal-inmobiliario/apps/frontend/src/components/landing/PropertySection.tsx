"use client";

import Link from "next/link";
import { usePropertyList } from "@/hooks/usePropertyList";
import type { PropertyListParams } from "@portal/api-client";
import { Skeleton } from "@/components/ui/Skeleton";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyGrid } from "@/components/properties/PropertyGrid";

type PropertySectionProps = {
  id: string;
  title: string;
  description: string;
  params: PropertyListParams;
  viewAllHref: string;
  viewAllLabel: string;
};

export function PropertySection({
  id,
  title,
  description,
  params,
  viewAllHref,
  viewAllLabel,
}: PropertySectionProps) {
  const { properties, isLoading, hasError, retry } = usePropertyList(params);
  const skeletonCount = params.pageSize ?? 3;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-foreground/70">{description}</p>
        </div>
        <Link
          href={viewAllHref}
          className="text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {viewAllLabel} →
        </Link>
      </div>

      {isLoading && (
        <PropertyGrid className="mt-6" role="status" aria-label={`Cargando ${title.toLowerCase()}`}>
          {Array.from({ length: skeletonCount }, (_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-[3/2] w-full" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </PropertyGrid>
      )}

      {hasError && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-danger/30 bg-danger/5 p-6 text-center"
        >
          <p className="font-medium">No pudimos cargar las propiedades.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !hasError && properties.length === 0 && (
        <p className="mt-6 rounded-lg border border-foreground/10 p-6 text-center text-foreground/70">
          Por ahora no hay propiedades en esta sección.
        </p>
      )}

      {!isLoading && !hasError && properties.length > 0 && (
        <PropertyGrid className="mt-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </PropertyGrid>
      )}
    </section>
  );
}

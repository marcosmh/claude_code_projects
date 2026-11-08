"use client";

import Link from "next/link";
import { usePropertyList } from "@/hooks/usePropertyList";
import type { PropertyListParams } from "@/lib/api/properties-client";
import { Skeleton } from "@/components/ui/Skeleton";
import { LandingPropertyCard } from "./LandingPropertyCard";

type PropertySectionProps = {
  id: string;
  title: string;
  description: string;
  params: PropertyListParams;
  viewAllHref: string;
  viewAllLabel: string;
};

const gridClassName = "mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

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
    <section aria-labelledby={`${id}-title`} className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-foreground/70">{description}</p>
        </div>
        <Link
          href={viewAllHref}
          className="text-sm font-semibold text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {viewAllLabel} →
        </Link>
      </div>

      {isLoading && (
        <div className={gridClassName} role="status" aria-label={`Cargando ${title.toLowerCase()}`}>
          {Array.from({ length: skeletonCount }, (_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-[3/2] w-full" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {hasError && (
        <div role="alert" className="mt-6 rounded-lg border border-red-600/30 bg-red-600/5 p-6 text-center">
          <p className="font-medium">No pudimos cargar las propiedades.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
        <div className={gridClassName}>
          {properties.map((property) => (
            <LandingPropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </section>
  );
}

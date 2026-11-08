"use client";

import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePropertyList } from "@/hooks/usePropertyList";
import { buildCatalogHref, catalogPageSize, parseCatalogParams } from "@/lib/catalog-params";
import { CatalogSearchForm } from "./CatalogSearchForm";
import { Pagination } from "./Pagination";
import { PropertyCard } from "./PropertyCard";
import { PropertyGrid } from "./PropertyGrid";

const headingByOperation = {
  SALE: "Propiedades en venta",
  RENT: "Propiedades en arriendo",
} as const;

export function PropertyCatalog() {
  const catalogParams = parseCatalogParams(useSearchParams());
  const { page, search, operation } = catalogParams;
  const { properties, total, totalPages, isLoading, hasError, retry } = usePropertyList({
    page,
    pageSize: catalogPageSize,
    ...(search ? { search } : {}),
    ...(operation ? { operation } : {}),
  });
  const heading = operation ? headingByOperation[operation] : "Propiedades";

  return (
    <section
      aria-labelledby="catalog-title"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <h1 id="catalog-title" className="text-3xl font-bold tracking-tight">
        {heading}
      </h1>
      <CatalogSearchForm
        key={`${search ?? ""}|${operation ?? ""}`}
        search={search}
        operation={operation}
      />
      {!isLoading && !hasError && total > 0 && (
        <p className="mt-1 text-foreground/70">
          {total} {total === 1 ? "propiedad disponible" : "propiedades disponibles"}
        </p>
      )}

      {isLoading && (
        <PropertyGrid className="mt-6" role="status" aria-label="Cargando propiedades">
          {Array.from({ length: 6 }, (_, index) => (
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
          {search
            ? `No encontramos propiedades para “${search}”.`
            : "No hay propiedades publicadas que mostrar."}
        </p>
      )}

      {!isLoading && !hasError && properties.length > 0 && (
        <>
          <PropertyGrid className="mt-6">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </PropertyGrid>
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(targetPage) => buildCatalogHref({ page: targetPage, search, operation })}
          />
        </>
      )}
    </section>
  );
}

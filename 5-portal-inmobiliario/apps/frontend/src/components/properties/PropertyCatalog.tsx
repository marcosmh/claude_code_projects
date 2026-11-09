"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePropertyLocations } from "@/hooks/usePropertyLocations";
import { usePropertyList } from "@/hooks/usePropertyList";
import { cn } from "@/lib/cn";
import {
  buildCatalogHref,
  catalogPageSize,
  parseCatalogParams,
  type CatalogFilters,
} from "@/lib/catalog-params";
import { CatalogSearchBar } from "./CatalogSearchBar";
import { FiltersSidebar } from "./FiltersSidebar";
import { Pagination } from "./Pagination";
import { PropertyCard } from "./PropertyCard";
import { PropertyGrid } from "./PropertyGrid";
import { SortSelect } from "./SortSelect";

const headingByOperation = {
  SALE: "Propiedades en venta",
  RENT: "Propiedades en arriendo",
} as const;

const FILTERS_PANEL_ID = "catalog-filters";

/** Cuenta cada valor seleccionado; la búsqueda de texto y el orden no son filtros del panel. */
function countActiveFilters(filters: CatalogFilters): number {
  const { operation, type } = filters;
  const singleValueKeys = [
    "city",
    "region",
    "commune",
    "minPrice",
    "maxPrice",
    "bedrooms",
    "bathrooms",
    "minUsableArea",
  ] as const;
  return (
    (operation?.length ?? 0) +
    (type?.length ?? 0) +
    singleValueKeys.filter((key) => filters[key] !== undefined).length
  );
}

export function PropertyCatalog() {
  const catalogParams = parseCatalogParams(useSearchParams());
  const { page, ...filters } = catalogParams;
  const { search, operation } = filters;
  const { properties, total, totalPages, isLoading, hasError, retry } = usePropertyList({
    page,
    pageSize: catalogPageSize,
    ...filters,
  });
  const { cities, regions } = usePropertyLocations();

  // Abierto por defecto en escritorio y cerrado en móvil, salvo que la persona lo cambie.
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const [panelPreference, setPanelPreference] = useState<boolean | null>(null);
  const isPanelOpen = panelPreference ?? isDesktop;
  const activeFilterCount = countActiveFilters(filters);

  const heading =
    operation?.length === 1 && operation[0] ? headingByOperation[operation[0]] : "Propiedades";
  const gridClassName = isPanelOpen ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-3";

  return (
    <section
      aria-labelledby="catalog-title"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <h1 id="catalog-title" className="text-3xl font-bold tracking-tight">
        {heading}
      </h1>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          aria-expanded={isPanelOpen}
          aria-controls={FILTERS_PANEL_ID}
          onClick={() => setPanelPreference(!isPanelOpen)}
          className="h-11 shrink-0 self-start rounded-md border border-foreground/20 px-4 text-sm font-semibold hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {isPanelOpen ? "Ocultar filtros" : "Mostrar filtros"}
          {activeFilterCount > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeFilterCount}
              <span className="sr-only"> filtros activos</span>
            </span>
          )}
        </button>
        <CatalogSearchBar key={search ?? ""} filters={filters} />
      </div>

      <div className="mt-6 gap-8 lg:flex lg:items-start">
        <div hidden={!isPanelOpen} className="mb-6 lg:sticky lg:top-20 lg:mb-0 lg:w-72 lg:shrink-0">
          <FiltersSidebar
            key={JSON.stringify(filters)}
            id={FILTERS_PANEL_ID}
            filters={filters}
            cities={cities}
            regions={regions}
          />
        </div>

        <div className="min-w-0 flex-1">
          {!isLoading && !hasError && total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-foreground/70">
                {total} {total === 1 ? "propiedad disponible" : "propiedades disponibles"}
              </p>
              <SortSelect filters={filters} />
            </div>
          )}

          {isLoading && (
            <PropertyGrid
              className={cn("mt-4", gridClassName)}
              role="status"
              aria-label="Cargando propiedades"
            >
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
              className="rounded-lg border border-danger/30 bg-danger/5 p-6 text-center"
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
            <p className="rounded-lg border border-foreground/10 p-6 text-center text-foreground/70">
              {search
                ? `No encontramos propiedades para “${search}”.`
                : activeFilterCount > 0
                  ? "No hay propiedades que coincidan con los filtros."
                  : "No hay propiedades publicadas que mostrar."}
            </p>
          )}

          {!isLoading && !hasError && properties.length > 0 && (
            <>
              <PropertyGrid className={cn("mt-4", gridClassName)}>
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </PropertyGrid>
              <Pagination
                page={page}
                totalPages={totalPages}
                buildHref={(targetPage) => buildCatalogHref({ page: targetPage, ...filters })}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

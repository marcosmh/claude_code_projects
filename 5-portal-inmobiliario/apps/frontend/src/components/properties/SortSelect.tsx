"use client";

import { useRouter } from "next/navigation";
import { buildCatalogHref, type CatalogFilters } from "@/lib/catalog-params";
import type { PropertySort } from "@portal/shared-types";

export const sortLabels: Record<PropertySort, string> = {
  newest: "Más recientes",
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
  area_asc: "Superficie: menor a mayor",
  area_desc: "Superficie: mayor a menor",
};

type SortSelectProps = {
  filters: CatalogFilters;
};

/** Cambiar el orden conserva búsqueda y filtros y vuelve a la primera página. */
export function SortSelect({ filters }: SortSelectProps) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="catalog-sort" className="text-sm font-medium">
        Ordenar por
      </label>
      <select
        id="catalog-sort"
        value={filters.sort ?? "newest"}
        onChange={(event) =>
          router.push(
            buildCatalogHref({ page: 1, ...filters, sort: event.target.value as PropertySort }),
          )
        }
        className="h-10 rounded-md border border-foreground/20 bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {(Object.keys(sortLabels) as PropertySort[]).map((sort) => (
          <option key={sort} value={sort}>
            {sortLabels[sort]}
          </option>
        ))}
      </select>
    </div>
  );
}

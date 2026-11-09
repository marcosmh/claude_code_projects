"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { buildCatalogHref, type CatalogFilters } from "@/lib/catalog-params";

const searchBarSchema = z.object({
  search: z.string().trim().max(100, "Máximo 100 caracteres"),
});
type SearchBarValues = z.infer<typeof searchBarSchema>;

type CatalogSearchBarProps = {
  filters: CatalogFilters;
};

/** Búsqueda de texto del catálogo. Conserva los filtros y el orden, y vuelve a la página 1. */
export function CatalogSearchBar({ filters }: CatalogSearchBarProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchBarValues>({
    resolver: zodResolver(searchBarSchema),
    defaultValues: { search: filters.search ?? "" },
  });

  const submitSearch = ({ search }: SearchBarValues) => {
    const nextFilters: CatalogFilters = { ...filters };
    delete nextFilters.search;
    router.push(buildCatalogHref({ page: 1, ...nextFilters, ...(search ? { search } : {}) }));
  };

  return (
    <form
      role="search"
      aria-label="Buscar propiedades"
      noValidate
      onSubmit={handleSubmit(submitSearch)}
      className="flex flex-1 gap-2"
    >
      <div className="flex-1">
        <label htmlFor="catalog-search" className="sr-only">
          Buscar
        </label>
        <input
          id="catalog-search"
          type="search"
          placeholder="Ej. casa con alberca en Mérida…"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={errors.search ? "true" : "false"}
          aria-describedby={errors.search ? "catalog-search-error" : undefined}
          className="h-11 w-full rounded-md border border-foreground/20 bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          {...register("search")}
        />
        {errors.search && (
          <p id="catalog-search-error" role="alert" className="mt-1 text-sm text-danger">
            {errors.search.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        className="h-11 rounded-md bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Buscar
      </button>
    </form>
  );
}

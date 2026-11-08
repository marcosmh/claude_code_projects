"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  buildCatalogSearchHref,
  propertySearchFormSchema,
  type PropertySearchFormValues,
} from "@/schemas/property-search-form";
import type { PropertyOperation } from "@portal/shared-types";

type CatalogSearchFormProps = {
  search?: string;
  operation?: PropertyOperation;
};

const fieldClassName =
  "h-11 w-full rounded-md border border-foreground/20 bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Búsqueda textual del catálogo. El estado vive en la URL (?search=). */
export function CatalogSearchForm({ search = "", operation }: CatalogSearchFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertySearchFormValues>({
    resolver: zodResolver(propertySearchFormSchema),
    defaultValues: { search, operation: operation ?? "ALL" },
  });

  return (
    <form
      role="search"
      aria-label="Buscar propiedades"
      noValidate
      onSubmit={handleSubmit((values) => router.push(buildCatalogSearchHref(values)))}
      className="mt-6 grid gap-3 sm:grid-cols-[1fr_12rem_auto]"
    >
      <div>
        <label htmlFor="catalog-search" className="mb-1 block text-sm font-medium">
          Buscar
        </label>
        <input
          id="catalog-search"
          type="search"
          placeholder="Título, colonia, ciudad, estado o descripción"
          aria-invalid={errors.search ? "true" : "false"}
          aria-describedby={errors.search ? "catalog-search-error" : undefined}
          className={fieldClassName}
          {...register("search")}
        />
        {errors.search && (
          <p id="catalog-search-error" role="alert" className="mt-1 text-sm text-danger">
            {errors.search.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="catalog-operation" className="mb-1 block text-sm font-medium">
          Operación
        </label>
        <select id="catalog-operation" className={fieldClassName} {...register("operation")}>
          <option value="ALL">Comprar o arrendar</option>
          <option value="SALE">Comprar</option>
          <option value="RENT">Arrendar</option>
        </select>
      </div>
      <button
        type="submit"
        className="h-11 self-end rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Buscar
      </button>
    </form>
  );
}

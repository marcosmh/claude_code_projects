"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { CatalogFilters } from "@/lib/catalog-params";
import { formatPropertyType } from "@/lib/format";
import {
  buildCatalogFiltersHref,
  catalogFiltersFormSchema,
  toFormValues,
  type CatalogFiltersFormValues,
} from "@/schemas/catalog-filters-form";
import { propertyTypeValues } from "@portal/shared-types";

type CatalogSearchFormProps = {
  filters: CatalogFilters;
};

const fieldClassName =
  "h-11 w-full rounded-md border border-foreground/20 bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Búsqueda y filtros combinables del catálogo. El estado vive en la URL. */
export function CatalogSearchForm({ filters }: CatalogSearchFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CatalogFiltersFormValues>({
    resolver: zodResolver(catalogFiltersFormSchema),
    defaultValues: toFormValues(filters),
  });
  const hasAdvancedFilters = Object.entries(filters).some(
    ([name, value]) =>
      name !== "search" && name !== "operation" && name !== "sort" && value !== undefined,
  );

  const field = (
    name: keyof CatalogFiltersFormValues,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label htmlFor={`catalog-${name}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`catalog-${name}`}
        aria-invalid={errors[name] ? "true" : "false"}
        aria-describedby={errors[name] ? `catalog-${name}-error` : undefined}
        className={fieldClassName}
        {...props}
        {...register(name)}
      />
      {errors[name] && (
        <p id={`catalog-${name}-error`} role="alert" className="mt-1 text-sm text-danger">
          {errors[name]?.message}
        </p>
      )}
    </div>
  );

  const select = (
    name: "operation" | "type" | "bedrooms" | "bathrooms",
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <div>
      <label htmlFor={`catalog-${name}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select id={`catalog-${name}`} className={fieldClassName} {...register(name)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      role="search"
      aria-label="Buscar propiedades"
      noValidate
      onSubmit={handleSubmit((values) =>
        router.push(buildCatalogFiltersHref(values, filters.sort)),
      )}
      className="mt-6 space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
        {field("search", "Buscar", {
          type: "search",
          placeholder: "Título, colonia, ciudad, estado o descripción",
        })}
        {select("operation", "Operación", [
          { value: "ALL", label: "Comprar o arrendar" },
          { value: "SALE", label: "Comprar" },
          { value: "RENT", label: "Arrendar" },
        ])}
        <button
          type="submit"
          className="h-11 self-end rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Buscar
        </button>
      </div>

      <details open={hasAdvancedFilters} className="rounded-lg border border-foreground/10 p-4">
        <summary className="cursor-pointer text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Más filtros
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {select("type", "Tipo de propiedad", [
            { value: "ALL", label: "Todos" },
            ...propertyTypeValues.map((value) => ({
              value,
              label: formatPropertyType(value),
            })),
          ])}
          {field("minPrice", "Precio mínimo", { inputMode: "decimal", placeholder: "0" })}
          {field("maxPrice", "Precio máximo", { inputMode: "decimal", placeholder: "Sin límite" })}
          {field("minUsableArea", "Superficie útil mínima (m²)", {
            inputMode: "decimal",
            placeholder: "0",
          })}
          {select("bedrooms", "Dormitorios", [
            { value: "", label: "Cualquiera" },
            ...["1", "2", "3", "4", "5"].map((value) => ({ value, label: `${value}+` })),
          ])}
          {select("bathrooms", "Baños", [
            { value: "", label: "Cualquiera" },
            ...["1", "2", "3", "4"].map((value) => ({ value, label: `${value}+` })),
          ])}
          {field("commune", "Colonia o comuna")}
          {field("city", "Ciudad")}
          {field("region", "Estado o región")}
        </div>
        <Link
          href="/properties"
          className="mt-4 inline-block text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Limpiar filtros
        </Link>
      </details>
    </form>
  );
}

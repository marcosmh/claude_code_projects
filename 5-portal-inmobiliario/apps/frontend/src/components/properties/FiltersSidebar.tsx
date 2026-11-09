"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { CatalogFilters } from "@/lib/catalog-params";
import { formatOperation, formatPropertyType } from "@/lib/format";
import {
  buildCatalogFiltersHref,
  catalogFiltersFormSchema,
  toFormValues,
  type CatalogFiltersFormValues,
} from "@/schemas/catalog-filters-form";
import { propertyTypeValues } from "@portal/shared-types";

type FiltersSidebarProps = {
  id: string;
  filters: CatalogFilters;
  cities: string[];
  regions: string[];
};

const inputClassName =
  "h-10 w-full rounded-md border border-foreground/20 bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[invalid=true]:border-danger";
const legendClassName = "mb-2 text-sm font-semibold";
const checkboxLabelClassName = "flex cursor-pointer items-center gap-2 py-1 text-sm";
const checkboxClassName =
  "h-4 w-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Opciones del select incluyendo el valor activo aunque ya no figure en la lista. */
function withCurrentValue(options: string[], current: string | undefined): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}

/** Panel lateral de filtros: casillas para selección múltiple y listas para selección única. */
export function FiltersSidebar({ id, filters, cities, regions }: FiltersSidebarProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CatalogFiltersFormValues>({
    resolver: zodResolver(catalogFiltersFormSchema),
    defaultValues: toFormValues(filters),
  });

  const numberField = (
    name: "minPrice" | "maxPrice" | "minUsableArea",
    label: string,
    placeholder: string,
  ) => (
    <div>
      <label htmlFor={`filter-${name}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`filter-${name}`}
        inputMode="decimal"
        placeholder={placeholder}
        aria-invalid={errors[name] ? "true" : "false"}
        aria-describedby={errors[name] ? `filter-${name}-error` : undefined}
        className={inputClassName}
        {...register(name)}
      />
      {errors[name] && (
        <p id={`filter-${name}-error`} role="alert" className="mt-1 text-xs text-danger">
          {errors[name]?.message}
        </p>
      )}
    </div>
  );

  const selectField = (
    name: "city" | "region",
    label: string,
    options: string[],
    emptyLabel: string,
  ) => (
    <div>
      <label htmlFor={`filter-${name}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select id={`filter-${name}`} className={inputClassName} {...register(name)}>
        <option value="">{emptyLabel}</option>
        {withCurrentValue(options, filters[name]).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );

  const radioGroup = (name: "bedrooms" | "bathrooms", legend: string, maximum: number) => (
    <fieldset>
      <legend className={legendClassName}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {["", ...Array.from({ length: maximum }, (_, index) => String(index + 1))].map((value) => (
          <label
            key={value}
            className="flex h-9 min-w-10 cursor-pointer items-center justify-center rounded-md border border-foreground/20 px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
          >
            <input type="radio" value={value} className="sr-only" {...register(name)} />
            {value === "" ? "Todos" : `${value}+`}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <form
      id={id}
      aria-label="Filtros de propiedades"
      noValidate
      onSubmit={handleSubmit((values) =>
        router.push(
          buildCatalogFiltersHref(values, { search: filters.search, sort: filters.sort }),
        ),
      )}
      className="space-y-5 rounded-xl border border-foreground/10 bg-surface p-4 shadow-sm"
    >
      <fieldset>
        <legend className={legendClassName}>Operación</legend>
        {(["SALE", "RENT"] as const).map((value) => (
          <label key={value} className={checkboxLabelClassName}>
            <input
              type="checkbox"
              value={value}
              className={checkboxClassName}
              {...register("operation")}
            />
            {formatOperation(value)}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className={legendClassName}>Tipo de propiedad</legend>
        {propertyTypeValues.map((value) => (
          <label key={value} className={checkboxLabelClassName}>
            <input
              type="checkbox"
              value={value}
              className={checkboxClassName}
              {...register("type")}
            />
            {formatPropertyType(value)}
          </label>
        ))}
      </fieldset>

      {selectField("region", "Estado o región", regions, "Todas las regiones")}
      {selectField("city", "Ciudad", cities, "Todas las ciudades")}
      <div>
        <label htmlFor="filter-commune" className="mb-1 block text-sm font-medium">
          Colonia o comuna
        </label>
        <input id="filter-commune" className={inputClassName} {...register("commune")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {numberField("minPrice", "Precio mínimo", "0")}
        {numberField("maxPrice", "Precio máximo", "Sin límite")}
      </div>
      {numberField("minUsableArea", "Superficie útil mínima (m²)", "0")}
      {radioGroup("bedrooms", "Dormitorios", 5)}
      {radioGroup("bathrooms", "Baños", 4)}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Aplicar filtros
        </button>
        <Link
          href={
            filters.search
              ? `/properties?search=${encodeURIComponent(filters.search)}`
              : "/properties"
          }
          className="text-center text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Limpiar filtros
        </Link>
      </div>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { buildCatalogHref, type CatalogFilters } from "@/lib/catalog-params";
import { formatAvailability, formatOperation, formatPropertyType } from "@/lib/format";
import {
  buildCatalogFiltersHref,
  catalogFiltersFormSchema,
  toFormValues,
  type CatalogFiltersFormValues,
} from "@/schemas/catalog-filters-form";
import { propertyAvailabilityValues, propertyTypeValues } from "@portal/shared-types";

type FiltersSidebarProps = {
  id: string;
  filters: CatalogFilters;
  cities: string[];
  regions: string[];
};

/** Pausa antes de aplicar cambios escritos a mano (texto, números y fechas). */
const TYPING_DEBOUNCE_MS = 400;

/** Campos que se aplican al instante; el resto espera a que la persona termine de escribir. */
const instantFields = new Set([
  "operation",
  "type",
  "availability",
  "city",
  "region",
  "bedrooms",
  "bathrooms",
]);

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
    reset,
    formState: { errors },
  } = useForm<CatalogFiltersFormValues>({
    resolver: zodResolver(catalogFiltersFormSchema),
    defaultValues: toFormValues(filters),
  });

  // URL con los filtros actuales y última URL que escribió este panel (para distinguir cambios propios).
  const currentHref = buildCatalogHref({ page: 1, ...filters });
  const lastAppliedHref = useRef(currentHref);
  const { search, sort } = filters;

  const applyValues = () =>
    handleSubmit((values) => {
      const href = buildCatalogFiltersHref(values, { search, sort });
      if (href === lastAppliedHref.current) return;
      lastAppliedHref.current = href;
      router.replace(href, { scroll: false });
    })();

  // Aplica los cambios dinámicamente: al instante en casillas y listas, con pausa al escribir.
  // El evento `change` de los controles sube hasta el formulario, cuando RHF ya guardó el valor.
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleApply = (fieldName: string) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => void applyValues(),
      instantFields.has(fieldName) ? 0 : TYPING_DEBOUNCE_MS,
    );
  };
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Si la URL cambia por otro medio (limpiar filtros, atrás del navegador), el formulario la sigue.
  useEffect(() => {
    if (currentHref === lastAppliedHref.current) return;
    lastAppliedHref.current = currentHref;
    reset(toFormValues(filters));
    // `filters` se resume en `currentHref`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHref, reset]);

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
        autoComplete="off"
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

  const dateField = (name: "publishedFrom" | "publishedTo", label: string) => (
    <div>
      <label htmlFor={`filter-${name}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`filter-${name}`}
        type="date"
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
      <div className="flex flex-col">
        {["", ...Array.from({ length: maximum }, (_, index) => String(index + 1))].map((value) => (
          <label key={value} className={checkboxLabelClassName}>
            <input type="radio" value={value} className={checkboxClassName} {...register(name)} />
            {value === "" ? "Todos" : `${value} o más`}
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
      onChange={(event) => scheduleApply((event.target as unknown as { name?: string }).name ?? "")}
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timerRef.current);
        void applyValues();
      }}
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
        <legend className={legendClassName}>Estado de la propiedad</legend>
        {propertyAvailabilityValues.map((value) => (
          <label key={value} className={checkboxLabelClassName}>
            <input
              type="checkbox"
              value={value}
              className={checkboxClassName}
              {...register("availability")}
            />
            {formatAvailability(value)}
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
        <input
          id="filter-commune"
          autoComplete="off"
          placeholder="Ej. Polanco…"
          className={inputClassName}
          {...register("commune")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {numberField("minPrice", "Precio mínimo", "0")}
        {numberField("maxPrice", "Precio máximo", "Sin límite")}
      </div>
      <fieldset>
        <legend className={legendClassName}>Fecha de publicación</legend>
        <div className="grid grid-cols-2 gap-3">
          {dateField("publishedFrom", "Desde")}
          {dateField("publishedTo", "Hasta")}
        </div>
      </fieldset>
      {numberField("minUsableArea", "Superficie útil mínima (m²)", "0")}
      {radioGroup("bedrooms", "Dormitorios", 5)}
      {radioGroup("bathrooms", "Baños", 4)}

      <div className="flex flex-col gap-2">
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

"use client";

import type { AdminPropertiesQuery } from "@portal/api-client";
import { propertyAvailabilityValues, propertyTypeValues } from "@portal/shared-types";
import type { PropertyAvailability, PropertyOperation, PropertyType } from "@portal/shared-types";
import { useEffect, useRef, useState } from "react";
import { formatAvailability, formatOperation, formatPropertyType } from "@/lib/format";

/** Filtros avanzados de la lista de administración (sin búsqueda de texto ni paginación). */
export type AdminAdvancedFilters = {
  operation: PropertyOperation[];
  type: PropertyType[];
  availability: PropertyAvailability[];
  minPrice: string;
  maxPrice: string;
  publishedFrom: string;
  publishedTo: string;
};

export const emptyAdminFilters: AdminAdvancedFilters = {
  operation: [],
  type: [],
  availability: [],
  minPrice: "",
  maxPrice: "",
  publishedFrom: "",
  publishedTo: "",
};

const NUMBER_PATTERN = /^\d+(\.\d+)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TYPING_DEBOUNCE_MS = 400;

/** Número de filtros avanzados con valor (cada casilla marcada cuenta como uno). */
export function countAdminFilters(filters: AdminAdvancedFilters): number {
  return (
    filters.operation.length +
    filters.type.length +
    filters.availability.length +
    [filters.minPrice, filters.maxPrice, filters.publishedFrom, filters.publishedTo].filter(
      (value) => value !== "",
    ).length
  );
}

/** Mensajes de validación por campo; los valores inválidos no se envían a la API. */
export function validateAdminFilters(
  filters: AdminAdvancedFilters,
): Partial<Record<"minPrice" | "maxPrice" | "publishedFrom" | "publishedTo", string>> {
  const errors: Partial<Record<"minPrice" | "maxPrice" | "publishedFrom" | "publishedTo", string>> =
    {};
  if (filters.minPrice !== "" && !NUMBER_PATTERN.test(filters.minPrice)) {
    errors.minPrice = "Ingresa un número válido";
  }
  if (filters.maxPrice !== "" && !NUMBER_PATTERN.test(filters.maxPrice)) {
    errors.maxPrice = "Ingresa un número válido";
  }
  if (
    !errors.minPrice &&
    !errors.maxPrice &&
    filters.minPrice !== "" &&
    filters.maxPrice !== "" &&
    Number(filters.minPrice) > Number(filters.maxPrice)
  ) {
    errors.minPrice = "El precio mínimo no puede superar al máximo";
  }
  for (const key of ["publishedFrom", "publishedTo"] as const) {
    if (filters[key] !== "" && !DATE_PATTERN.test(filters[key])) {
      errors[key] = "Ingresa una fecha válida";
    }
  }
  if (
    !errors.publishedFrom &&
    !errors.publishedTo &&
    filters.publishedFrom !== "" &&
    filters.publishedTo !== "" &&
    filters.publishedFrom > filters.publishedTo
  ) {
    errors.publishedFrom = "La fecha inicial no puede ser posterior a la final";
  }
  return errors;
}

/** Filtros listos para `buildAdminPropertiesUrl` (los vacíos se omiten). */
export function toAdminQuery(filters: AdminAdvancedFilters): Partial<AdminPropertiesQuery> {
  return {
    operation: filters.operation,
    type: filters.type,
    availability: filters.availability,
    ...(filters.minPrice !== "" && { minPrice: Number(filters.minPrice) }),
    ...(filters.maxPrice !== "" && { maxPrice: Number(filters.maxPrice) }),
    ...(filters.publishedFrom !== "" && { publishedFrom: filters.publishedFrom }),
    ...(filters.publishedTo !== "" && { publishedTo: filters.publishedTo }),
  };
}

/** Claves de los filtros avanzados en la URL de la lista. */
export const adminFilterParamKeys = [
  "operation",
  "type",
  "availability",
  "minPrice",
  "maxPrice",
  "publishedFrom",
  "publishedTo",
] as const;

function parseList<TValue extends string>(raw: string, allowed: readonly TValue[]): TValue[] {
  return raw
    .split(",")
    .filter((item): item is TValue => (allowed as readonly string[]).includes(item));
}

/** Lee los filtros avanzados de los query params; ignora valores inválidos. */
export function adminFiltersFromParams(
  params: Record<(typeof adminFilterParamKeys)[number], string>,
): AdminAdvancedFilters {
  return {
    operation: parseList(params.operation, ["SALE", "RENT"] as const),
    type: parseList(params.type, propertyTypeValues),
    availability: parseList(params.availability, propertyAvailabilityValues),
    minPrice: NUMBER_PATTERN.test(params.minPrice) ? params.minPrice : "",
    maxPrice: NUMBER_PATTERN.test(params.maxPrice) ? params.maxPrice : "",
    publishedFrom: DATE_PATTERN.test(params.publishedFrom) ? params.publishedFrom : "",
    publishedTo: DATE_PATTERN.test(params.publishedTo) ? params.publishedTo : "",
  };
}

/** Convierte los filtros avanzados a query params (listas separadas por comas). */
export function adminFiltersToParams(
  filters: AdminAdvancedFilters,
): Record<(typeof adminFilterParamKeys)[number], string> {
  return {
    operation: filters.operation.join(","),
    type: filters.type.join(","),
    availability: filters.availability.join(","),
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    publishedFrom: filters.publishedFrom,
    publishedTo: filters.publishedTo,
  };
}

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const inputClassName = `h-10 w-full rounded-md border border-foreground/20 bg-surface px-3 text-sm text-foreground aria-[invalid=true]:border-danger ${focusClassName}`;
const legendClassName = "mb-2 text-sm font-semibold";
const checkboxLabelClassName = "flex cursor-pointer items-center gap-2 py-1 text-sm";
const checkboxClassName = `size-5 accent-primary ${focusClassName}`;

type AdminPropertyFiltersProps = {
  id: string;
  /** Filtros aplicados actualmente; el panel parte de ellos. */
  filters: AdminAdvancedFilters;
  onChange: (filters: AdminAdvancedFilters) => void;
};

function toggle<TValue extends string>(values: TValue[], value: TValue): TValue[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

/**
 * Panel de filtros avanzados de la administración de propiedades. Las casillas se aplican al
 * instante; los campos de precio y fecha, tras una breve pausa y solo si son válidos.
 */
export function AdminPropertyFilters({ id, filters, onChange }: AdminPropertyFiltersProps) {
  const [draft, setDraft] = useState(filters);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const errors = validateAdminFilters(draft);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const apply = (next: AdminAdvancedFilters, delayMs: number) => {
    setDraft(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (Object.keys(validateAdminFilters(next)).length === 0) onChange(next);
    }, delayMs);
  };

  const textField = (
    name: "minPrice" | "maxPrice" | "publishedFrom" | "publishedTo",
    label: string,
    kind: "number" | "date",
  ) => (
    <div>
      <label htmlFor={`${id}-${name}`} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        type={kind === "date" ? "date" : "text"}
        inputMode={kind === "number" ? "decimal" : undefined}
        autoComplete="off"
        placeholder={kind === "number" ? (name === "minPrice" ? "0" : "Sin límite") : undefined}
        value={draft[name]}
        aria-invalid={errors[name] ? "true" : "false"}
        aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
        onChange={(event) => apply({ ...draft, [name]: event.target.value }, TYPING_DEBOUNCE_MS)}
        className={`${inputClassName} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring`}
      />
      {errors[name] && (
        <p id={`${id}-${name}-error`} role="alert" className="mt-1 text-xs text-danger">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form
      id={id}
      aria-label="Filtros avanzados de propiedades"
      noValidate
      onSubmit={(event) => event.preventDefault()}
      className="space-y-5 rounded-xl border border-foreground/10 bg-surface p-4 shadow-sm"
    >
      <fieldset>
        <legend className={legendClassName}>Operación</legend>
        {(["SALE", "RENT"] as const).map((value) => (
          <label key={value} className={checkboxLabelClassName}>
            <input
              type="checkbox"
              checked={draft.operation.includes(value)}
              onChange={() => apply({ ...draft, operation: toggle(draft.operation, value) }, 0)}
              className={checkboxClassName}
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
              checked={draft.availability.includes(value)}
              onChange={() =>
                apply({ ...draft, availability: toggle(draft.availability, value) }, 0)
              }
              className={checkboxClassName}
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
              checked={draft.type.includes(value)}
              onChange={() => apply({ ...draft, type: toggle(draft.type, value) }, 0)}
              className={checkboxClassName}
            />
            {formatPropertyType(value)}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className={legendClassName}>Rango de precio</legend>
        <div className="grid grid-cols-2 gap-3">
          {textField("minPrice", "Mínimo", "number")}
          {textField("maxPrice", "Máximo", "number")}
        </div>
      </fieldset>

      <fieldset>
        <legend className={legendClassName}>Fecha de publicación</legend>
        <div className="grid grid-cols-2 gap-3">
          {textField("publishedFrom", "Desde", "date")}
          {textField("publishedTo", "Hasta", "date")}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => {
          clearTimeout(timerRef.current);
          setDraft(emptyAdminFilters);
          onChange(emptyAdminFilters);
        }}
        disabled={countAdminFilters(draft) === 0}
        className={`h-10 w-full rounded-md border border-foreground/20 text-sm font-semibold hover:bg-foreground/5 disabled:opacity-50 ${focusClassName}`}
      >
        Limpiar filtros
      </button>
    </form>
  );
}

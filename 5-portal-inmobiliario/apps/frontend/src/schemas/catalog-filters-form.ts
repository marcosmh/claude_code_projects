import { propertyTypeValues } from "@portal/shared-types";
import { z } from "zod";
import { buildCatalogHref, type CatalogFilters } from "@/lib/catalog-params";

const optionalNumberText = z
  .string()
  .trim()
  .regex(/^(\d+(\.\d+)?)?$/, "Ingresa un número válido");
const optionalLocationText = z.string().trim().max(100, "Máximo 100 caracteres");

/** Filtros del sidebar. La búsqueda de texto y el orden se gestionan fuera de este formulario. */
export const catalogFiltersFormSchema = z
  .object({
    operation: z.array(z.enum(["SALE", "RENT"])),
    type: z.array(z.enum(propertyTypeValues)),
    city: optionalLocationText,
    region: optionalLocationText,
    commune: optionalLocationText,
    minPrice: optionalNumberText,
    maxPrice: optionalNumberText,
    bedrooms: z.enum(["", "1", "2", "3", "4", "5"]),
    bathrooms: z.enum(["", "1", "2", "3", "4"]),
    minUsableArea: optionalNumberText,
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === "" || maxPrice === "" || Number(minPrice) <= Number(maxPrice),
    { message: "El precio mínimo no puede superar al máximo", path: ["minPrice"] },
  );

export type CatalogFiltersFormValues = z.infer<typeof catalogFiltersFormSchema>;

/** Valores iniciales del formulario a partir de los filtros activos en la URL. */
export function toFormValues(filters: CatalogFilters): CatalogFiltersFormValues {
  const numberText = (value: number | undefined) => (value === undefined ? "" : String(value));
  return {
    operation: filters.operation ?? [],
    type: filters.type ?? [],
    city: filters.city ?? "",
    region: filters.region ?? "",
    commune: filters.commune ?? "",
    minPrice: numberText(filters.minPrice),
    maxPrice: numberText(filters.maxPrice),
    bedrooms: numberText(filters.bedrooms) as CatalogFiltersFormValues["bedrooms"],
    bathrooms: numberText(filters.bathrooms) as CatalogFiltersFormValues["bathrooms"],
    minUsableArea: numberText(filters.minUsableArea),
  };
}

/**
 * URL del catálogo con los valores del formulario. Conserva la búsqueda y el orden actuales
 * (`current`), omite los valores vacíos y reinicia a la página 1.
 */
export function buildCatalogFiltersHref(
  values: CatalogFiltersFormValues,
  current: Pick<CatalogFilters, "search" | "sort"> = {},
): string {
  const filters: CatalogFilters = { ...current };
  if (values.operation.length > 0) filters.operation = values.operation;
  if (values.type.length > 0) filters.type = values.type;
  if (values.city) filters.city = values.city;
  if (values.region) filters.region = values.region;
  if (values.commune) filters.commune = values.commune;
  if (values.minPrice !== "") filters.minPrice = Number(values.minPrice);
  if (values.maxPrice !== "") filters.maxPrice = Number(values.maxPrice);
  if (values.bedrooms !== "") filters.bedrooms = Number(values.bedrooms);
  if (values.bathrooms !== "") filters.bathrooms = Number(values.bathrooms);
  if (values.minUsableArea !== "") filters.minUsableArea = Number(values.minUsableArea);
  return buildCatalogHref({ page: 1, ...filters });
}

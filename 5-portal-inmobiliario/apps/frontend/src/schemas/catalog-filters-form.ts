import { propertyTypeValues } from "@portal/shared-types";
import { z } from "zod";
import { buildCatalogHref, type CatalogFilters } from "@/lib/catalog-params";

const optionalNumberText = z
  .string()
  .trim()
  .regex(/^(\d+(\.\d+)?)?$/, "Ingresa un número válido");
const optionalLocationText = z.string().trim().max(100, "Máximo 100 caracteres");

export const catalogFiltersFormSchema = z
  .object({
    search: z.string().trim().max(100, "Máximo 100 caracteres"),
    operation: z.enum(["ALL", "SALE", "RENT"]),
    type: z.enum(["ALL", ...propertyTypeValues]),
    minPrice: optionalNumberText,
    maxPrice: optionalNumberText,
    bedrooms: z.enum(["", "1", "2", "3", "4", "5"]),
    bathrooms: z.enum(["", "1", "2", "3", "4"]),
    minUsableArea: optionalNumberText,
    commune: optionalLocationText,
    city: optionalLocationText,
    region: optionalLocationText,
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
    search: filters.search ?? "",
    operation: filters.operation ?? "ALL",
    type: filters.type ?? "ALL",
    minPrice: numberText(filters.minPrice),
    maxPrice: numberText(filters.maxPrice),
    bedrooms: numberText(filters.bedrooms) as CatalogFiltersFormValues["bedrooms"],
    bathrooms: numberText(filters.bathrooms) as CatalogFiltersFormValues["bathrooms"],
    minUsableArea: numberText(filters.minUsableArea),
    commune: filters.commune ?? "",
    city: filters.city ?? "",
    region: filters.region ?? "",
  };
}

/** URL del catálogo para los valores del formulario: omite vacíos y reinicia a la página 1. */
export function buildCatalogFiltersHref(
  values: CatalogFiltersFormValues,
  sort?: CatalogFilters["sort"],
): string {
  const filters: CatalogFilters = sort ? { sort } : {};
  if (values.search) filters.search = values.search;
  if (values.operation !== "ALL") filters.operation = values.operation;
  if (values.type !== "ALL") filters.type = values.type;
  if (values.minPrice !== "") filters.minPrice = Number(values.minPrice);
  if (values.maxPrice !== "") filters.maxPrice = Number(values.maxPrice);
  if (values.bedrooms !== "") filters.bedrooms = Number(values.bedrooms);
  if (values.bathrooms !== "") filters.bathrooms = Number(values.bathrooms);
  if (values.minUsableArea !== "") filters.minUsableArea = Number(values.minUsableArea);
  if (values.commune) filters.commune = values.commune;
  if (values.city) filters.city = values.city;
  if (values.region) filters.region = values.region;
  return buildCatalogHref({ page: 1, ...filters });
}

import { z } from "zod";

export const propertySearchFormSchema = z.object({
  search: z.string().trim().max(100, "Máximo 100 caracteres"),
  operation: z.enum(["ALL", "SALE", "RENT"]),
});

export type PropertySearchFormValues = z.infer<typeof propertySearchFormSchema>;

/** Construye la URL del catálogo; los valores vacíos no se incluyen. */
export function buildCatalogSearchHref(values: PropertySearchFormValues): string {
  const searchParams = new URLSearchParams();
  const searchText = values.search.trim();
  if (searchText) searchParams.set("search", searchText);
  if (values.operation !== "ALL") searchParams.set("operation", values.operation);
  const queryString = searchParams.toString();
  return queryString ? `/properties?${queryString}` : "/properties";
}

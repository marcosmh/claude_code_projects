import type { PropertyOperation } from "@portal/shared-types";

export const catalogPageSize = 12;

export type CatalogParams = {
  page: number;
  search?: string;
  operation?: PropertyOperation;
};

/** Interpreta los query parameters del catálogo; los valores inválidos se ignoran. */
export function parseCatalogParams(searchParams: URLSearchParams): CatalogParams {
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const rawOperation = searchParams.get("operation");
  const operation = rawOperation === "SALE" || rawOperation === "RENT" ? rawOperation : undefined;
  const search = (searchParams.get("search") ?? "").trim().slice(0, 100);
  return {
    page,
    ...(search ? { search } : {}),
    ...(operation ? { operation } : {}),
  };
}

/** Construye la URL del catálogo para una página, conservando búsqueda y operación. */
export function buildCatalogHref({ page, search, operation }: CatalogParams): string {
  const searchParams = new URLSearchParams();
  if (search) searchParams.set("search", search);
  if (operation) searchParams.set("operation", operation);
  if (page > 1) searchParams.set("page", String(page));
  const queryString = searchParams.toString();
  return queryString ? `/properties?${queryString}` : "/properties";
}

import type { PropertyOperation, PropertyType } from "@portal/shared-types";
import { propertyTypeValues } from "@portal/shared-types";

export const catalogPageSize = 12;

const numericFilterKeys = [
  "minPrice",
  "maxPrice",
  "bedrooms",
  "bathrooms",
  "minUsableArea",
] as const;
const locationFilterKeys = ["commune", "city", "region"] as const;

export type CatalogFilters = {
  search?: string;
  operation?: PropertyOperation;
  type?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  /** Mínimo de dormitorios. */
  bedrooms?: number;
  /** Mínimo de baños. */
  bathrooms?: number;
  minUsableArea?: number;
  commune?: string;
  city?: string;
  region?: string;
};

export type CatalogParams = CatalogFilters & { page: number };

function readText(searchParams: URLSearchParams, key: string): string | undefined {
  const value = (searchParams.get(key) ?? "").trim().slice(0, 100);
  return value === "" ? undefined : value;
}

function readNonNegativeNumber(searchParams: URLSearchParams, key: string): number | undefined {
  const rawValue = (searchParams.get(key) ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(rawValue)) return undefined;
  return Number(rawValue);
}

/** Interpreta los query parameters del catálogo; los valores inválidos se ignoran. */
export function parseCatalogParams(searchParams: URLSearchParams): CatalogParams {
  const rawPage = Number(searchParams.get("page"));
  const parsed: CatalogParams = {
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };

  const search = readText(searchParams, "search");
  if (search) parsed.search = search;
  const rawOperation = searchParams.get("operation");
  if (rawOperation === "SALE" || rawOperation === "RENT") parsed.operation = rawOperation;
  const rawType = searchParams.get("type");
  const type = propertyTypeValues.find((candidate) => candidate === rawType);
  if (type) parsed.type = type;
  for (const key of numericFilterKeys) {
    const value = readNonNegativeNumber(searchParams, key);
    if (value !== undefined) parsed[key] = value;
  }
  for (const key of locationFilterKeys) {
    const value = readText(searchParams, key);
    if (value) parsed[key] = value;
  }
  return parsed;
}

/** Construye la URL del catálogo conservando búsqueda y filtros; la página 1 se omite. */
export function buildCatalogHref(params: CatalogParams): string {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.operation) searchParams.set("operation", params.operation);
  if (params.type) searchParams.set("type", params.type);
  for (const key of numericFilterKeys) {
    const value = params[key];
    if (value !== undefined) searchParams.set(key, String(value));
  }
  for (const key of locationFilterKeys) {
    const value = params[key];
    if (value) searchParams.set(key, value);
  }
  if (params.page > 1) searchParams.set("page", String(params.page));
  const queryString = searchParams.toString();
  return queryString ? `/properties?${queryString}` : "/properties";
}

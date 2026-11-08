import type {
  PaginatedResponse,
  PropertyOperation,
  PropertyType,
  PropertySummaryDto,
} from "@portal/shared-types";

export type PropertyListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  operation?: PropertyOperation;
  type?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minUsableArea?: number;
  commune?: string;
  city?: string;
  region?: string;
  featured?: boolean;
};

const numericFilterKeys = [
  "minPrice",
  "maxPrice",
  "bedrooms",
  "bathrooms",
  "minUsableArea",
] as const;
const locationFilterKeys = ["commune", "city", "region"] as const;

export function buildPropertiesUrl(params: PropertyListParams = {}): string {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set("page", String(params.page));
  if (params.pageSize !== undefined) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.operation !== undefined) searchParams.set("operation", params.operation);
  if (params.type !== undefined) searchParams.set("type", params.type);
  for (const key of numericFilterKeys) {
    const value = params[key];
    if (value !== undefined) searchParams.set(key, String(value));
  }
  for (const key of locationFilterKeys) {
    const value = params[key];
    if (value) searchParams.set(key, value);
  }
  if (params.featured !== undefined) searchParams.set("featured", String(params.featured));
  const queryString = searchParams.toString();
  return queryString ? `/api/properties?${queryString}` : "/api/properties";
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function fetchPropertyPage(
  url: string,
): Promise<PaginatedResponse<PropertySummaryDto>> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError("No se pudieron cargar las propiedades", response.status);
  }
  return (await response.json()) as PaginatedResponse<PropertySummaryDto>;
}

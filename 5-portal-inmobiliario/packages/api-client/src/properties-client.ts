import type {
  PaginatedResponse,
  PropertyOperation,
  PropertySummaryDto,
} from "@portal/shared-types";

export type PropertyListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  operation?: PropertyOperation;
  featured?: boolean;
};

export function buildPropertiesUrl(params: PropertyListParams = {}): string {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set("page", String(params.page));
  if (params.pageSize !== undefined) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.operation !== undefined) searchParams.set("operation", params.operation);
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

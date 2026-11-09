import type {
  InquiryResponseDto,
  PaginatedResponse,
  PropertyDetailDto,
  PropertyOperation,
  PropertySort,
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
  sort?: PropertySort;
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
  if (params.sort !== undefined && params.sort !== "newest") searchParams.set("sort", params.sort);
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

export function buildPropertyUrl(propertyId: string): string {
  return `/api/properties/${encodeURIComponent(propertyId)}`;
}

/** Obtiene el detalle de una propiedad; un 404 se propaga como ApiRequestError con status 404. */
export async function fetchPropertyDetail(url: string): Promise<PropertyDetailDto> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError(
      response.status === 404 ? "Propiedad no encontrada" : "No se pudo cargar la propiedad",
      response.status,
    );
  }
  return (await response.json()) as PropertyDetailDto;
}

export type InquiryRequest = {
  propertyId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
};

/** Envía una consulta de contacto. Lanza ApiRequestError si la API no responde con éxito. */
export async function submitInquiry(request: InquiryRequest): Promise<InquiryResponseDto> {
  const response = await fetch("/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new ApiRequestError("No se pudo enviar la consulta", response.status);
  }
  return (await response.json()) as InquiryResponseDto;
}

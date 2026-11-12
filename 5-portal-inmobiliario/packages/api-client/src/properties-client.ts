import type {
  PropertyAvailability,
  InquiryResponseDto,
  PaginatedResponse,
  PropertyDetailDto,
  PropertyLocationsDto,
  PropertyOperation,
  PropertySort,
  PropertyType,
  PropertySummaryDto,
} from "@portal/shared-types";

export type PropertyListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Una o varias operaciones (se envían separadas por comas). */
  operation?: PropertyOperation | readonly PropertyOperation[];
  /** Uno o varios tipos (se envían separados por comas). */
  type?: PropertyType | readonly PropertyType[];
  /** Uno o varios estados (se envían separados por comas). */
  availability?: PropertyAvailability | readonly PropertyAvailability[];
  /** Fecha de publicación desde / hasta (`AAAA-MM-DD`). */
  publishedFrom?: string;
  publishedTo?: string;
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

function joinValues(value: string | readonly string[] | undefined): string {
  if (value === undefined) return "";
  return typeof value === "string" ? value : value.join(",");
}

export function buildPropertiesUrl(params: PropertyListParams = {}): string {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set("page", String(params.page));
  if (params.pageSize !== undefined) searchParams.set("pageSize", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  const operations = joinValues(params.operation);
  if (operations) searchParams.set("operation", operations);
  const types = joinValues(params.type);
  if (types) searchParams.set("type", types);
  const availabilities = joinValues(params.availability);
  if (availabilities) searchParams.set("availability", availabilities);
  if (params.publishedFrom) searchParams.set("publishedFrom", params.publishedFrom);
  if (params.publishedTo) searchParams.set("publishedTo", params.publishedTo);
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

export const propertyLocationsUrl = "/api/locations";

/** Ciudades y regiones con propiedades publicadas (opciones de los filtros). */
export async function fetchPropertyLocations(url: string): Promise<PropertyLocationsDto> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError("No se pudieron cargar las ubicaciones", response.status);
  }
  return (await response.json()) as PropertyLocationsDto;
}

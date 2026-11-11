import type {
  AdminPropertyDto,
  AdminPropertyListItemDto,
  PaginatedResponse,
  PropertyInput,
} from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const adminPropertiesUrl = "/api/admin/properties";

export type AdminPropertiesQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "published" | "draft";
};

/** URL de la lista de administración; sirve también como clave de caché de SWR. */
export function buildAdminPropertiesUrl({
  page = 1,
  pageSize,
  search,
  status = "all",
}: AdminPropertiesQuery = {}): string {
  const params = new URLSearchParams({ page: String(page) });
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  if (search && search.trim() !== "") params.set("search", search.trim());
  if (status !== "all") params.set("status", status);
  return `${adminPropertiesUrl}?${params.toString()}`;
}

function propertyUrl(propertyId: string): string {
  return `${adminPropertiesUrl}/${encodeURIComponent(propertyId)}`;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" && body.message !== "" ? body.message : fallback;
  } catch {
    return fallback;
  }
}

async function request<TResult>(
  url: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<TResult> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
    },
  });
  if (!response.ok) {
    throw new ApiRequestError(await readErrorMessage(response, fallbackMessage), response.status);
  }
  return (response.status === 204 ? undefined : await response.json()) as TResult;
}

/** Lista paginada de propiedades de cualquier estado (requiere ADMIN). */
export function fetchAdminProperties(
  url: string = buildAdminPropertiesUrl(),
): Promise<PaginatedResponse<AdminPropertyListItemDto>> {
  return request(url, {}, "No se pudieron cargar las propiedades");
}

export function fetchAdminProperty(propertyId: string): Promise<AdminPropertyDto> {
  return request(propertyUrl(propertyId), {}, "No se pudo cargar la propiedad");
}

export function createAdminProperty(input: PropertyInput): Promise<AdminPropertyDto> {
  return request(
    adminPropertiesUrl,
    { method: "POST", body: JSON.stringify(input) },
    "No se pudo crear la propiedad",
  );
}

export function updateAdminProperty(
  propertyId: string,
  input: PropertyInput,
): Promise<AdminPropertyDto> {
  return request(
    propertyUrl(propertyId),
    { method: "PUT", body: JSON.stringify(input) },
    "No se pudo guardar la propiedad",
  );
}

export function deleteAdminProperty(propertyId: string): Promise<void> {
  return request(propertyUrl(propertyId), { method: "DELETE" }, "No se pudo eliminar la propiedad");
}

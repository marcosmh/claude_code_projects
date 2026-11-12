import type { AdminInquiryDto, PaginatedResponse } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const adminInquiriesUrl = "/api/admin/inquiries";

export type AdminInquiriesQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  propertyId?: string;
};

/** URL de la lista de consultas; sirve también como clave de caché de SWR. */
export function buildAdminInquiriesUrl({
  page = 1,
  pageSize,
  search,
  propertyId,
}: AdminInquiriesQuery = {}): string {
  const params = new URLSearchParams({ page: String(page) });
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  if (search && search.trim() !== "") params.set("search", search.trim());
  if (propertyId) params.set("propertyId", propertyId);
  return `${adminInquiriesUrl}?${params.toString()}`;
}

/** Lista paginada de todas las consultas (requiere ADMIN). */
export async function fetchAdminInquiries(
  url: string = buildAdminInquiriesUrl(),
): Promise<PaginatedResponse<AdminInquiryDto>> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    let message = "No se pudieron cargar las consultas";
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string" && body.message !== "") message = body.message;
    } catch {
      // Se conserva el mensaje genérico.
    }
    throw new ApiRequestError(message, response.status);
  }
  return (await response.json()) as PaginatedResponse<AdminInquiryDto>;
}

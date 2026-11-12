import type { AuditCategory, AuditLogDto, PaginatedResponse } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const adminAuditUrl = "/api/admin/audit";

export type AdminAuditQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: AuditCategory;
  from?: string;
  to?: string;
};

/** URL de la lista del registro de auditoría; sirve también como clave de caché de SWR. */
export function buildAdminAuditUrl({
  page = 1,
  pageSize,
  search,
  category,
  from,
  to,
}: AdminAuditQuery = {}): string {
  const params = new URLSearchParams({ page: String(page) });
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  if (search && search.trim() !== "") params.set("search", search.trim());
  if (category) params.set("category", category);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `${adminAuditUrl}?${params.toString()}`;
}

/** Registro de auditoría paginado (requiere ADMIN; 401 sin sesión, 403 para USER). */
export async function fetchAdminAudit(
  url: string = buildAdminAuditUrl(),
): Promise<PaginatedResponse<AuditLogDto>> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    let message = "No se pudo cargar el registro de auditoría";
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string" && body.message !== "") message = body.message;
    } catch {
      // Se conserva el mensaje genérico.
    }
    throw new ApiRequestError(message, response.status);
  }
  return (await response.json()) as PaginatedResponse<AuditLogDto>;
}

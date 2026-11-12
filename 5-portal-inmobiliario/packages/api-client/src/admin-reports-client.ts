import type { AdminReportsDto } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const adminReportsUrl = "/api/admin/reports";

/** Reportes y estadísticas (requiere sesión ADMIN; 401 sin sesión, 403 para USER). */
export async function fetchAdminReports(url: string = adminReportsUrl): Promise<AdminReportsDto> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError("No se pudieron cargar los reportes", response.status);
  }
  return (await response.json()) as AdminReportsDto;
}

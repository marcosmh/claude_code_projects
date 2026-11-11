import type { AdminDashboardDto } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const adminDashboardUrl = "/api/admin/dashboard";

/** Indicadores del panel (requiere sesión ADMIN; 401 sin sesión, 403 para USER). */
export async function fetchAdminDashboard(
  url: string = adminDashboardUrl,
): Promise<AdminDashboardDto> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError("No se pudo cargar el panel de administración", response.status);
  }
  return (await response.json()) as AdminDashboardDto;
}

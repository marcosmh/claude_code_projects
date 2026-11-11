import type { PaginatedResponse, UserInquiryDto } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const userInquiriesUrl = "/api/inquiries/mine";

export type UserInquiriesQuery = { page?: number; searchText?: string };

/** URL de la página de consultas propias; sirve también como clave de caché de SWR. */
export function buildUserInquiriesUrl({ page = 1, searchText }: UserInquiriesQuery = {}): string {
  const params = new URLSearchParams({ page: String(page) });
  if (searchText && searchText.trim() !== "") params.set("q", searchText.trim());
  return `${userInquiriesUrl}?${params.toString()}`;
}

/** Página de consultas enviadas por la sesión actual (requiere sesión; si no, estado 401). */
export async function fetchUserInquiries(
  url: string = buildUserInquiriesUrl(),
): Promise<PaginatedResponse<UserInquiryDto>> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError("No se pudieron cargar tus consultas", response.status);
  }
  return (await response.json()) as PaginatedResponse<UserInquiryDto>;
}

/** Elimina una consulta propia (204). Falla con ApiRequestError si no existe o no es tuya. */
export async function deleteInquiry(inquiryId: string): Promise<void> {
  const response = await fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ApiRequestError("No se pudo eliminar la consulta", response.status);
  }
}

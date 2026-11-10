import type { PropertySummaryDto } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const inquiredPropertiesUrl = "/api/inquiries/properties";

/** Propiedades sobre las que la sesión actual envió consultas (requiere sesión; si no, estado 401). */
export async function fetchInquiredProperties(
  url: string = inquiredPropertiesUrl,
): Promise<PropertySummaryDto[]> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError("No se pudieron cargar tus consultas", response.status);
  }
  return (await response.json()) as PropertySummaryDto[];
}

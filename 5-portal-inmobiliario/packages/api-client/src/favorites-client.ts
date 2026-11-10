import type { PropertySummaryDto } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const favoritesUrl = "/api/favorites";

function favoriteUrl(propertyId: string): string {
  return `${favoritesUrl}/${encodeURIComponent(propertyId)}`;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" && body.message !== "" ? body.message : fallback;
  } catch {
    return fallback;
  }
}

/** Propiedades favoritas de la sesión actual (requiere sesión; sin ella lanza con estado 401). */
export async function fetchFavorites(url: string = favoritesUrl): Promise<PropertySummaryDto[]> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError(
      await readErrorMessage(response, "No se pudieron cargar tus favoritos"),
      response.status,
    );
  }
  return (await response.json()) as PropertySummaryDto[];
}

/** Guarda la propiedad en favoritos. Es idempotente: repetirlo no la duplica. */
export async function addFavorite(propertyId: string): Promise<PropertySummaryDto> {
  const response = await fetch(favoriteUrl(propertyId), {
    method: "PUT",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ApiRequestError(
      await readErrorMessage(response, "No se pudo guardar la propiedad"),
      response.status,
    );
  }
  return (await response.json()) as PropertySummaryDto;
}

export async function removeFavorite(propertyId: string): Promise<void> {
  const response = await fetch(favoriteUrl(propertyId), { method: "DELETE" });
  if (!response.ok) {
    throw new ApiRequestError(
      await readErrorMessage(response, "No se pudo quitar la propiedad"),
      response.status,
    );
  }
}

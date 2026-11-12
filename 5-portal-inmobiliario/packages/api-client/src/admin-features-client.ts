import type { FeatureDto } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const adminFeaturesUrl = "/api/admin/features";

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" && body.message !== "" ? body.message : fallback;
  } catch {
    return fallback;
  }
}

async function send<TResult>(
  url: string,
  method: string,
  fallbackMessage: string,
  jsonBody?: unknown,
): Promise<TResult> {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(jsonBody !== undefined && { "Content-Type": "application/json" }),
    },
    ...(jsonBody !== undefined && { body: JSON.stringify(jsonBody) }),
  });
  if (!response.ok) {
    throw new ApiRequestError(await readErrorMessage(response, fallbackMessage), response.status);
  }
  return (await response.json()) as TResult;
}

/** Catálogo completo de características (requiere ADMIN). */
export function fetchAdminFeatures(): Promise<FeatureDto[]> {
  return send(adminFeaturesUrl, "GET", "No se pudieron cargar las características");
}

export function createAdminFeature(name: string): Promise<FeatureDto> {
  return send(adminFeaturesUrl, "POST", "No se pudo crear la característica", { name });
}

/** Reemplaza las características de la propiedad; devuelve el conjunto resultante. */
export function setPropertyFeatures(
  propertyId: string,
  featureIds: readonly string[],
): Promise<FeatureDto[]> {
  return send(
    `/api/admin/properties/${encodeURIComponent(propertyId)}/features`,
    "PUT",
    "No se pudieron guardar las características",
    { featureIds },
  );
}

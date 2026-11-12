import { cacheLife } from "next/cache";
import { buildPropertyUrl, fetchPropertyDetail } from "@portal/api-client";
import type { PropertyDetailDto } from "@portal/shared-types";

/**
 * Propiedad para generar la metadata (servidor). Se cachea unos minutos y cualquier fallo
 * (no existe, no está publicada, backend caído) devuelve null: la metadata nunca rompe la página.
 */
export async function loadPropertyForMetadata(
  propertyId: string,
): Promise<PropertyDetailDto | null> {
  "use cache";
  cacheLife("minutes");
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
  try {
    return await fetchPropertyDetail(`${backendUrl}${buildPropertyUrl(propertyId)}`);
  } catch {
    return null;
  }
}

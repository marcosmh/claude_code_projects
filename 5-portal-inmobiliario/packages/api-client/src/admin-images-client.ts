import type { PropertyImageDto } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

function imagesUrl(propertyId: string): string {
  return `/api/admin/properties/${encodeURIComponent(propertyId)}/images`;
}

function imageUrl(propertyId: string, imageId: string): string {
  return `${imagesUrl(propertyId)}/${encodeURIComponent(imageId)}`;
}

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
  init: RequestInit,
  fallbackMessage: string,
  jsonBody?: unknown,
): Promise<TResult> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(jsonBody !== undefined && { "Content-Type": "application/json" }),
    },
    ...(jsonBody !== undefined && { body: JSON.stringify(jsonBody) }),
  });
  if (!response.ok) {
    throw new ApiRequestError(await readErrorMessage(response, fallbackMessage), response.status);
  }
  return (response.status === 204 ? undefined : await response.json()) as TResult;
}

/** Sube una imagen (multipart; el navegador fija el Content-Type con su boundary). */
export function uploadPropertyImage(propertyId: string, file: File): Promise<PropertyImageDto> {
  const form = new FormData();
  form.set("file", file);
  return send(imagesUrl(propertyId), { method: "POST", body: form }, "No se pudo subir la imagen");
}

export function deletePropertyImage(propertyId: string, imageId: string): Promise<void> {
  return send(imageUrl(propertyId, imageId), { method: "DELETE" }, "No se pudo eliminar la imagen");
}

/** Marca la imagen como principal; devuelve la lista actualizada. */
export function setPrimaryPropertyImage(
  propertyId: string,
  imageId: string,
): Promise<PropertyImageDto[]> {
  return send(
    imageUrl(propertyId, imageId),
    { method: "PATCH" },
    "No se pudo cambiar la imagen principal",
    { isPrimary: true },
  );
}

/** Guarda el orden de las imágenes (todos los ids); devuelve la lista actualizada. */
export function reorderPropertyImages(
  propertyId: string,
  imageIds: readonly string[],
): Promise<PropertyImageDto[]> {
  return send(imagesUrl(propertyId), { method: "PUT" }, "No se pudo guardar el orden", {
    imageIds,
  });
}

import type { SystemSettingsDto, UpdateSystemSettingsInput } from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const publicSettingsUrl = "/api/settings";
export const adminSettingsUrl = "/api/admin/settings";

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" && body.message !== "" ? body.message : fallback;
  } catch {
    return fallback;
  }
}

/** Configuración pública del portal (registro abierto, moneda por defecto y contacto). */
export async function fetchPublicSettings(
  url: string = publicSettingsUrl,
): Promise<SystemSettingsDto> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError("No se pudo cargar la configuración", response.status);
  }
  return (await response.json()) as SystemSettingsDto;
}

/** Configuración para el panel de administración (requiere ADMIN). */
export async function fetchAdminSettings(
  url: string = adminSettingsUrl,
): Promise<SystemSettingsDto> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new ApiRequestError("No se pudo cargar la configuración", response.status);
  }
  return (await response.json()) as SystemSettingsDto;
}

/** Guarda la configuración completa (requiere ADMIN; 400 con datos inválidos). */
export async function updateAdminSettings(
  input: UpdateSystemSettingsInput,
): Promise<SystemSettingsDto> {
  const response = await fetch(adminSettingsUrl, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new ApiRequestError(
      await readErrorMessage(response, "No se pudo guardar la configuración"),
      response.status,
    );
  }
  return (await response.json()) as SystemSettingsDto;
}

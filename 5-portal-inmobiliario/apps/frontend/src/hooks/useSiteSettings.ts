"use client";

import useSWR from "swr";
import { fetchPublicSettings, publicSettingsUrl } from "@portal/api-client";
import { defaultSystemSettings, type SystemSettingsDto } from "@portal/shared-types";

/**
 * Configuración pública del portal (spec §59). Mientras carga o si falla la consulta se usan los
 * valores por defecto: nunca se bloquea una pantalla por no poder leer la configuración.
 */
export function useSiteSettings(): { settings: SystemSettingsDto; isLoaded: boolean } {
  const { data } = useSWR(publicSettingsUrl, fetchPublicSettings, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  return { settings: data ?? defaultSystemSettings, isLoaded: data !== undefined };
}

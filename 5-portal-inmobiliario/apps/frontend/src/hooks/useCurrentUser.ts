"use client";

import useSWR, { useSWRConfig } from "swr";
import { currentUserUrl, fetchCurrentUser } from "@portal/api-client";
import type { AuthUserDto } from "@portal/shared-types";

/**
 * Usuario de la sesión actual (cookie httpOnly, nunca localStorage). `user` es null sin sesión
 * y undefined mientras se consulta. Todas las instancias comparten la misma clave de SWR.
 */
export function useCurrentUser() {
  const { data, error } = useSWR(currentUserUrl, fetchCurrentUser, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const { mutate } = useSWRConfig();

  return {
    user: data,
    // Sin dato ni error aún: es también el estado del render en el servidor (SWR no consulta allí),
    // así el primer render del cliente coincide con el HTML y no hay desajuste de hidratación.
    isLoading: data === undefined && error === undefined,
    /** Actualiza la sesión en todos los componentes sin volver a consultar la API. */
    setUser: (user: AuthUserDto | null) => mutate(currentUserUrl, user, { revalidate: false }),
  };
}

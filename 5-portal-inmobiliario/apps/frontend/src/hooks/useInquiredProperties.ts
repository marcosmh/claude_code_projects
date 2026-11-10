"use client";

import useSWR from "swr";
import { fetchInquiredProperties, inquiredPropertiesUrl } from "@portal/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Propiedades sobre las que la persona con sesión envió consultas. Sin sesión no consulta.
 * `refresh` vuelve a pedir la lista (p. ej. tras enviar una consulta nueva).
 */
export function useInquiredProperties() {
  const { user } = useCurrentUser();
  const { data, mutate } = useSWR(user ? inquiredPropertiesUrl : null, fetchInquiredProperties, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return {
    properties: data,
    refresh: () => mutate(),
  };
}

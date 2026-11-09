"use client";

import useSWR from "swr";
import { buildPropertiesUrl, fetchPropertyPage, type PropertyListParams } from "@portal/api-client";

export function usePropertyList(params: PropertyListParams) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    buildPropertiesUrl(params),
    fetchPropertyPage,
    {
      revalidateOnFocus: false,
      // Al cambiar filtros, orden o página se conservan los resultados anteriores mientras llegan los nuevos.
      keepPreviousData: true,
    },
  );

  return {
    properties: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    /** Carga inicial: todavía no hay resultados que mostrar (ni previos). */
    isLoading: isLoading && data === undefined,
    /** Hay resultados en pantalla que se están actualizando. */
    isRefreshing: isValidating && data !== undefined,
    hasError: error !== undefined,
    retry: () => mutate(),
  };
}

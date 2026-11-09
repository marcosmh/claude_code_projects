"use client";

import useSWR from "swr";
import { fetchPropertyLocations, propertyLocationsUrl } from "@portal/api-client";

/** Ciudades y regiones disponibles para los filtros; si falla, los selects quedan solo con el valor actual. */
export function usePropertyLocations() {
  const { data } = useSWR(propertyLocationsUrl, fetchPropertyLocations, {
    revalidateOnFocus: false,
    // Las ubicaciones casi no cambian: se comparten entre montajes durante un minuto.
    dedupingInterval: 60_000,
  });
  return { cities: data?.cities ?? [], regions: data?.regions ?? [] };
}

"use client";

import useSWR from "swr";
import {
  buildPropertiesUrl,
  fetchPropertyPage,
  type PropertyListParams,
} from "@/lib/api/properties-client";

export function usePropertyList(params: PropertyListParams) {
  const { data, error, isLoading, mutate } = useSWR(
    buildPropertiesUrl(params),
    fetchPropertyPage,
    { revalidateOnFocus: false },
  );

  return {
    properties: data?.items ?? [],
    isLoading,
    hasError: error !== undefined,
    retry: () => mutate(),
  };
}

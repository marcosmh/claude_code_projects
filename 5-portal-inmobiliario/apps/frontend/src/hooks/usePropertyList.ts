"use client";

import useSWR from "swr";
import { buildPropertiesUrl, fetchPropertyPage, type PropertyListParams } from "@portal/api-client";

export function usePropertyList(params: PropertyListParams) {
  const { data, error, isLoading, mutate } = useSWR(buildPropertiesUrl(params), fetchPropertyPage, {
    revalidateOnFocus: false,
  });

  return {
    properties: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    hasError: error !== undefined,
    retry: () => mutate(),
  };
}

"use client";

import useSWR from "swr";
import { ApiRequestError, buildPropertyUrl, fetchPropertyDetail } from "@portal/api-client";

export function usePropertyDetail(propertyId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    buildPropertyUrl(propertyId),
    fetchPropertyDetail,
    {
      revalidateOnFocus: false,
      // Reintentar no tiene sentido cuando la propiedad no existe.
      shouldRetryOnError: (requestError) =>
        !(requestError instanceof ApiRequestError && requestError.status === 404),
    },
  );

  return {
    property: data,
    isLoading,
    isNotFound: error instanceof ApiRequestError && error.status === 404,
    hasError: error !== undefined && !(error instanceof ApiRequestError && error.status === 404),
    retry: () => mutate(),
  };
}

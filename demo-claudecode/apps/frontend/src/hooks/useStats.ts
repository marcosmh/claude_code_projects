import type { Currency } from "@invoices/shared-types";
import { useQuery } from "@tanstack/react-query";
import { statsService } from "@/services/statsService";
import { queryKeys } from "./queryKeys";

/** Sin `currency` cuenta todas las facturas (válido para contadores, no para importes). */
export function useStatsSummary(currency?: Currency) {
  return useQuery({
    queryKey: queryKeys.summary(currency),
    queryFn: ({ signal }) => statsService.summary(currency, signal),
  });
}

export function useMonthlyStats(months = 6, currency?: Currency) {
  return useQuery({
    queryKey: queryKeys.monthly(months, currency),
    queryFn: ({ signal }) => statsService.monthly(months, currency, signal),
  });
}

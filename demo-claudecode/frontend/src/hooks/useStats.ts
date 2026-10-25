import { useQuery } from "@tanstack/react-query";
import { statsService } from "@/services/statsService";
import { queryKeys } from "./queryKeys";

export function useStatsSummary() {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: ({ signal }) => statsService.summary(signal),
  });
}

export function useMonthlyStats(months = 6) {
  return useQuery({
    queryKey: queryKeys.monthly(months),
    queryFn: ({ signal }) => statsService.monthly(months, signal),
  });
}

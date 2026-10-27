import type { MonthBucket, StatsSummary } from "@/types/stats";
import { request } from "./apiClient";

export const statsService = {
  async summary(signal?: AbortSignal): Promise<StatsSummary> {
    return (await request<StatsSummary>("/stats/summary", { signal })).data;
  },

  async monthly(months: number, signal?: AbortSignal): Promise<MonthBucket[]> {
    return (await request<MonthBucket[]>("/stats/monthly", { query: { months }, signal })).data;
  },
};

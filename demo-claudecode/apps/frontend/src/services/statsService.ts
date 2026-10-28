import type { Currency } from "@invoices/shared-types";
import type { MonthBucket, StatsSummary } from "@/types/stats";
import { request } from "./apiClient";

export const statsService = {
  /** Con `currency` solo cuenta facturas de esa moneda; sin ella cuenta todas (los importes mezclarían monedas). */
  async summary(currency?: Currency, signal?: AbortSignal): Promise<StatsSummary> {
    return (await request<StatsSummary>("/stats/summary", { query: { currency }, signal })).data;
  },

  async monthly(months: number, currency?: Currency, signal?: AbortSignal): Promise<MonthBucket[]> {
    return (await request<MonthBucket[]>("/stats/monthly", { query: { months, currency }, signal })).data;
  },
};

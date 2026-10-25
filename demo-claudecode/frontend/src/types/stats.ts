import type { Status } from "./invoice";

export interface StatusTotals {
  count: number;
  totalCents: number;
}

export interface StatsSummary {
  byStatus: Record<Status, StatusTotals>;
  overdue: StatusTotals;
  totalCount: number;
}

export interface MonthBucket {
  key: string;
  label: string;
  title: string;
  totalsCents: Record<Status, number>;
}

import type { InvoiceStatus } from "./invoice";

export interface StatusBucket {
  count: number;
  totalCents: number;
}

export interface StatsSummaryResponse {
  byStatus: Record<InvoiceStatus, StatusBucket>;
  overdue: StatusBucket;
  totalCount: number;
}

export interface MonthBucketResponse {
  key: string;
  label: string;
  title: string;
  totalsCents: Record<InvoiceStatus, number>;
}

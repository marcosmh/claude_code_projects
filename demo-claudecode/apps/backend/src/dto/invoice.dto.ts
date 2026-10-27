import type { z } from "zod";
import type { InvoiceStatus } from "../types";
import type {
  invoiceBodySchema,
  listQuerySchema,
  monthlyQuerySchema,
  statusBodySchema,
} from "../validators/invoice.validator";

// ---- Requests (validated, normalised input) ----
export type InvoiceRequest = z.output<typeof invoiceBodySchema>;
export type StatusRequest = z.output<typeof statusBodySchema>;
export type ListInvoicesQuery = z.output<typeof listQuerySchema>;
export type MonthlyStatsQuery = z.output<typeof monthlyQuerySchema>;

// ---- Responses ----
export interface InvoiceItemResponse {
  id: number;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface InvoiceResponse {
  id: number;
  number: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  isOverdue: boolean;
  taxRate: number;
  notes: string | null;
  items: InvoiceItemResponse[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListInvoicesResult {
  data: InvoiceResponse[];
  meta: PaginationMeta;
}

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

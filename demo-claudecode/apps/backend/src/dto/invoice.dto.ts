import type { z } from "zod";
import type { monthlyQuerySchema } from "../validators/invoice.validator";

// ---- Requests (validated, normalised input) ----
export type { InvoiceRequest, ListInvoicesQuery, StatusRequest } from "@invoices/shared-validation";
export type MonthlyStatsQuery = z.output<typeof monthlyQuerySchema>;

// ---- Responses (wire contract, shared with the frontend) ----
export type {
  InvoiceItemResponse,
  InvoiceResponse,
  MonthBucketResponse,
  PaginationMeta,
  StatsSummaryResponse,
  StatusBucket,
} from "@invoices/shared-types";

import type { InvoiceResponse, PaginationMeta } from "@invoices/shared-types";

export interface ListInvoicesResult {
  data: InvoiceResponse[];
  meta: PaginationMeta;
}

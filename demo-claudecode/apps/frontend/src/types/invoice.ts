/** Tipos del contrato REST (apps/backend/docs/api.md), compartidos con el backend. Dinero siempre en centavos. */
import type { Currency as CurrencyCode, InvoiceItemResponse, InvoiceResponse, InvoiceStatus, PaginationMeta } from "@invoices/shared-types";

export { CURRENCIES, CURRENCY_LABELS, STATUSES } from "@invoices/shared-types";
export type { InvoiceItemRequest, InvoiceRequest } from "@invoices/shared-validation";

export type Currency = CurrencyCode;
export type Status = InvoiceStatus;
export type InvoiceItem = InvoiceItemResponse;
export type Invoice = InvoiceResponse;
export type PageMeta = PaginationMeta;

export interface InvoiceListParams {
  status?: Status;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

/** Tipos del contrato REST (backend/docs/api.md). Dinero siempre en centavos. */
export const STATUSES = ["DRAFT", "SENT", "PAID"] as const;
export type Status = (typeof STATUSES)[number];

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface Invoice {
  id: number;
  number: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  issueDate: string;
  dueDate: string;
  status: Status;
  isOverdue: boolean;
  taxRate: number;
  notes: string | null;
  items: InvoiceItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItemRequest {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface InvoiceRequest {
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  issueDate: string;
  dueDate: string;
  status: Status;
  taxRate: number;
  notes: string | null;
  items: InvoiceItemRequest[];
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

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

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID";

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Invoice {
  id: number;
  number: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  taxRate: number;
  notes: string | null;
  items: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface InvoiceData {
  clientName: string;
  clientEmail?: string | null;
  clientAddress?: string | null;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  taxRate: number;
  notes?: string | null;
  items: InvoiceItemInput[];
}

/** Input to create an invoice. `number` is a placeholder until `assignNumber` runs (see createWithNumber). */
export interface CreateInvoiceInput extends InvoiceData {
  number: string;
}

export type UpdateInvoiceInput = InvoiceData;

export interface InvoiceFilters {
  status?: InvoiceStatus;
  /** Case-insensitive match on client name or invoice number. */
  search?: string;
}

export interface Pagination {
  page: number; // 1-based
  pageSize: number;
}

export interface FindAllInvoicesOptions {
  filters?: InvoiceFilters;
  /** Omit to return every match. */
  pagination?: Pagination;
}

export interface PaginatedInvoices {
  data: Invoice[];
  total: number;
}

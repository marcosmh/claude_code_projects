export const STATUSES = ["DRAFT", "SENT", "PAID"] as const;
export type InvoiceStatus = (typeof STATUSES)[number];

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return (STATUSES as readonly string[]).includes(value);
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  PAID: "Pagada",
};

export const CURRENCIES = ["MXN", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  MXN: "Pesos mexicanos (MXN)",
  USD: "Dólares (USD)",
  EUR: "Euros (EUR)",
};

/** REST wire shape (dates as ISO strings, money in cents). Contract: apps/backend/docs/api.md. */
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
  currency: Currency;
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

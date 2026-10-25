import type { InvoiceStatus } from "../types";

export const STATUSES = ["DRAFT", "SENT", "PAID"] as const satisfies readonly InvoiceStatus[];

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  PAID: "Pagada",
};

export interface LineItem {
  quantity: number;
  unitPriceCents: number;
}

export interface Totals {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function lineAmountCents(item: LineItem): number {
  return Math.round(item.quantity * item.unitPriceCents);
}

/** Totals are never stored: always derived from the line items and the tax rate. */
export function calcTotals(items: LineItem[], taxRate: number): Totals {
  const subtotalCents = items.reduce((sum, item) => sum + lineAmountCents(item), 0);
  const taxCents = Math.round((subtotalCents * taxRate) / 100);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

/** "Overdue" is not a status: it is a SENT invoice whose due date has passed. */
export function isOverdue(invoice: { status: InvoiceStatus; dueDate: Date }, now: Date): boolean {
  return invoice.status === "SENT" && invoice.dueDate < now;
}

export function buildInvoiceNumber(id: number): string {
  return `FAC-${String(id).padStart(4, "0")}`;
}

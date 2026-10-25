import type { InvoiceStatus } from "../types";

export const STATUSES = ["DRAFT", "SENT", "PAID"] as const satisfies readonly InvoiceStatus[];

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return (STATUSES as readonly string[]).includes(value);
}

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

/**
 * Rounds to whole cents, half up. The product is first trimmed to 15 significant digits so binary
 * floating-point noise does not push an exact half to the wrong side (1.005 * 100 is
 * 100.49999999999999 in IEEE-754, but the intended value is 100.5, i.e. 101 cents). Exact for
 * amounts below 1e13 cents (100 billion); the input limits keep every line under that.
 */
export function roundCents(value: number): number {
  return Math.round(Number(value.toPrecision(15)));
}

export function lineAmountCents(item: LineItem): number {
  return roundCents(item.quantity * item.unitPriceCents);
}

/** Totals are never stored: always derived from the line items and the tax rate. */
export function calcTotals(items: LineItem[], taxRate: number): Totals {
  const subtotalCents = items.reduce((sum, item) => sum + lineAmountCents(item), 0);
  const taxCents = roundCents((subtotalCents * taxRate) / 100);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

/** "Overdue" is not a status: it is a SENT invoice whose due date has passed. */
export function isOverdue(invoice: { status: InvoiceStatus; dueDate: Date }, now: Date): boolean {
  return invoice.status === "SENT" && invoice.dueDate < now;
}

export function buildInvoiceNumber(id: number): string {
  return `FAC-${String(id).padStart(4, "0")}`;
}

import type { InvoiceStatus } from "../types";

export { isInvoiceStatus, STATUS_LABELS, STATUSES } from "@invoices/shared-types";
export { calcTotals, lineAmountCents, roundCents } from "@invoices/shared-utils";
export type { LineItem, Totals } from "@invoices/shared-utils";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Overdue" is not a status: it is a SENT invoice whose due date has passed. Due dates are calendar
 * days stored at 00:00 UTC, so the invoice is still on time during the whole due day and becomes
 * overdue from the next day (00:00 UTC) on.
 */
export function isOverdue(invoice: { status: InvoiceStatus; dueDate: Date }, now: Date): boolean {
  return invoice.status === "SENT" && invoice.dueDate.getTime() + DAY_MS <= now.getTime();
}

export function buildInvoiceNumber(id: number): string {
  return `FAC-${String(id).padStart(4, "0")}`;
}

import type { InvoiceLine, InvoiceRecord } from "./types.js";

type Priced = Pick<InvoiceLine, "quantity" | "unitPriceCents">;

/** Same rule as `@invoices/shared-utils` (half up, trimmed to 15 digits so float noise does not tip an exact half). */
export function roundCents(value: number): number {
  return Math.round(Number(value.toPrecision(15)));
}

export const lineAmountCents = (item: Priced): number => roundCents(item.quantity * item.unitPriceCents);

export function calcTotals(items: Priced[], taxRate: number) {
  const subtotalCents = items.reduce((sum, item) => sum + lineAmountCents(item), 0);
  const taxCents = roundCents((subtotalCents * taxRate) / 100);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

/** The invoice with its derived amounts: each line's subtotal plus the invoice totals, all in integer cents. */
export function toInvoiceView(invoice: InvoiceRecord) {
  return {
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    clientAddress: invoice.clientAddress,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    currency: invoice.currency,
    taxRate: invoice.taxRate,
    notes: invoice.notes,
    lines: invoice.items.map((item) => ({ ...item, subtotalCents: lineAmountCents(item) })),
    ...calcTotals(invoice.items, invoice.taxRate),
  };
}

export type InvoiceView = ReturnType<typeof toInvoiceView>;

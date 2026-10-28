import { calcTotals, isOverdue, lineAmountCents } from "../domain/invoice";
import type { Invoice } from "../types";
import type { InvoiceResponse } from "./invoice.dto";

export function toInvoiceResponse(invoice: Invoice, now: Date): InvoiceResponse {
  return {
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    clientAddress: invoice.clientAddress,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    status: invoice.status,
    isOverdue: isOverdue(invoice, now),
    taxRate: invoice.taxRate,
    currency: invoice.currency,
    notes: invoice.notes,
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      amountCents: lineAmountCents(item),
    })),
    ...calcTotals(invoice.items, invoice.taxRate),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

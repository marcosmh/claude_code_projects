import { z } from "zod";
import type { InvoiceView } from "../domain/totals.js";
import type { InvoiceService } from "../services/InvoiceService.js";
import { formatDate, formatMoney } from "./format.js";
import { errorResult, textResult, type ToolResult } from "./result.js";

export const getInvoiceSummaryInput = {
  id: z.number().int().positive().describe("Id numérico de la factura (FAC-0007 tiene id 7)"),
};

export function describeInvoice(invoice: InvoiceView): string {
  const money = (cents: number) => formatMoney(cents, invoice.currency);
  const lines = invoice.lines.map(
    (l, i) => `${i + 1}. ${l.description}: ${l.quantity} × ${money(l.unitPriceCents)} = ${money(l.subtotalCents)}`,
  );
  return [
    `Factura ${invoice.number} (id ${invoice.id})`,
    `Cliente: ${invoice.clientName}`,
    `Estado: ${invoice.status} · Moneda: ${invoice.currency} · Emitida ${formatDate(invoice.issueDate)} · Vence ${formatDate(invoice.dueDate)}`,
    "Líneas:",
    ...(lines.length ? lines : ["(sin líneas)"]),
    `Subtotal: ${money(invoice.subtotalCents)}`,
    `Impuesto (${invoice.taxRate} %): ${money(invoice.taxCents)}`,
    `Total: ${money(invoice.totalCents)}`,
  ].join("\n");
}

export async function getInvoiceSummary(
  service: InvoiceService,
  input: z.infer<z.ZodObject<typeof getInvoiceSummaryInput>>,
): Promise<ToolResult> {
  try {
    const invoice = await service.getInvoice(input.id);
    return textResult(describeInvoice(invoice), invoice);
  } catch (error) {
    return errorResult(error);
  }
}

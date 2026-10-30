import { z } from "zod";
import { CURRENCIES } from "../domain/types.js";
import type { InvoiceService } from "../services/InvoiceService.js";
import { formatMoney } from "./format.js";
import { errorResult, textResult, type ToolResult } from "./result.js";

export const getSummaryTotalsInput = {
  currency: z.enum(CURRENCIES).optional().describe("Moneda a consultar; sin ella se devuelve una entrada por cada moneda"),
};

export async function getSummaryTotals(
  service: InvoiceService,
  input: z.infer<z.ZodObject<typeof getSummaryTotalsInput>>,
): Promise<ToolResult> {
  try {
    const totals = await service.getSummaryTotals(input.currency);
    const text = totals.length
      ? totals
          .map(({ currency, issued, collected, receivable }) =>
            [
              `${currency}:`,
              `  Total emitidas: ${formatMoney(issued.totalCents, currency)} (${issued.count} facturas)`,
              `  Total cobradas: ${formatMoney(collected.totalCents, currency)} (${collected.count} facturas)`,
              `  Total por cobrar: ${formatMoney(receivable.totalCents, currency)} (${receivable.count} facturas)`,
            ].join("\n"),
          )
          .join("\n")
      : "No hay facturas emitidas";
    return textResult(text, { totals });
  } catch (error) {
    return errorResult(error);
  }
}

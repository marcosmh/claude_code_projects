import { z } from "zod";
import type { InvoiceService } from "../services/InvoiceService.js";
import { errorResult, textResult, type ToolResult } from "./result.js";

export const getClientInvoiceInput = {
  clientName: z.string().trim().min(1).max(100).describe("Nombre del cliente o parte de él (sin distinguir mayúsculas)"),
  limit: z.number().int().min(1).max(200).default(50).describe("Máximo de facturas a devolver, las más recientes primero"),
};

export async function getClientInvoice(
  service: InvoiceService,
  input: z.infer<z.ZodObject<typeof getClientInvoiceInput>>,
): Promise<ToolResult> {
  try {
    const result = await service.getClientInvoices(input.clientName, input.limit);
    // The whole point of this tool is the complete JSON, so the text carries it too (clients that ignore
    // structuredContent still get everything).
    return textResult(JSON.stringify({ clientName: input.clientName, ...result }, null, 2), {
      clientName: input.clientName,
      ...result,
    });
  } catch (error) {
    return errorResult(error);
  }
}

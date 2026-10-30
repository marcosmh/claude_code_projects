import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { InvoiceService } from "./services/InvoiceService.js";
import { getClientInvoice, getClientInvoiceInput } from "./tools/getClientInvoice.js";
import { getInvoiceSummary, getInvoiceSummaryInput } from "./tools/getInvoiceSummary.js";
import { getSummaryTotals, getSummaryTotalsInput } from "./tools/getSummaryTotals.js";

export const SERVER_NAME = "invoices-mcp";
export const SERVER_VERSION = "0.1.0";

/** The three tools only read: no write goes to the database (the connection is READ ONLY) and nothing leaves it. */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

export function createServer(service: InvoiceService): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    "get_invoice_summary",
    {
      title: "Resumen de una factura",
      description:
        "Dada la id de una factura devuelve el nombre del cliente, sus líneas (descripción, cantidad, precio unitario y " +
        "subtotal por línea) y el total de la factura. Los importes van en centavos enteros (structuredContent) y formateados (texto).",
      inputSchema: getInvoiceSummaryInput,
      annotations: { title: "Resumen de una factura", ...READ_ONLY },
    },
    (input) => getInvoiceSummary(service, input),
  );

  server.registerTool(
    "get_client_invoice",
    {
      title: "Facturas de un cliente",
      description:
        "Busca las facturas por nombre de cliente (coincidencia parcial) y devuelve el JSON completo de cada una: datos del " +
        "cliente, fechas, estado, moneda, líneas con subtotal y totales. Las más recientes primero.",
      inputSchema: getClientInvoiceInput,
      annotations: { title: "Facturas de un cliente", ...READ_ONLY },
    },
    (input) => getClientInvoice(service, input),
  );

  server.registerTool(
    "get_summary_totals",
    {
      title: "Totales: emitidas, cobradas y por cobrar",
      description:
        "Total emitido (facturas enviadas y pagadas), total cobrado (pagadas) y total por cobrar (enviadas, sin pagar). " +
        "Los borradores no cuentan. Una entrada por moneda: nunca se suman monedas distintas.",
      inputSchema: getSummaryTotalsInput,
      annotations: { title: "Totales de facturación", ...READ_ONLY },
    },
    (input) => getSummaryTotals(service, input),
  );

  return server;
}

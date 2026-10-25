import type { InvoiceListParams } from "@/types/invoice";

export const queryKeys = {
  invoices: ["invoices"] as const,
  invoiceList: (params: InvoiceListParams) => ["invoices", "list", params] as const,
  invoice: (id: number) => ["invoices", "detail", id] as const,
  stats: ["stats"] as const,
  summary: ["stats", "summary"] as const,
  monthly: (months: number) => ["stats", "monthly", months] as const,
};

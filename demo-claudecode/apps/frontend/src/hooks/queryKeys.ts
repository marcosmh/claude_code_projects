import type { Currency } from "@invoices/shared-types";
import type { InvoiceListParams } from "@/types/invoice";

export const queryKeys = {
  session: ["auth", "session"] as const,
  invoices: ["invoices"] as const,
  invoiceList: (params: InvoiceListParams) => ["invoices", "list", params] as const,
  invoice: (id: number) => ["invoices", "detail", id] as const,
  stats: ["stats"] as const,
  summary: (currency?: Currency) => ["stats", "summary", currency ?? "all"] as const,
  monthly: (months: number, currency?: Currency) => ["stats", "monthly", months, currency ?? "all"] as const,
};

import type { InvoiceRecord, InvoiceTotalsRow } from "../domain/types.js";

/** Read-only access to the invoices. The only implementation talks to PostgreSQL; tests use a fake. */
export interface InvoiceRepository {
  findById(id: number): Promise<InvoiceRecord | null>;
  /** Newest first; `truncated` is true when more than `limit` invoices matched. */
  findByClientName(name: string, limit: number): Promise<{ invoices: InvoiceRecord[]; truncated: boolean }>;
  /** Sent and paid invoices (drafts are not issued), optionally of one currency. */
  findIssued(currency?: string): Promise<InvoiceTotalsRow[]>;
}

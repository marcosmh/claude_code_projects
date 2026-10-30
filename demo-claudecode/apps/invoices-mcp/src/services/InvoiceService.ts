import { calcTotals, toInvoiceView } from "../domain/totals.js";
import { InvoiceNotFoundError } from "../domain/types.js";
import type { InvoiceRepository } from "./InvoiceRepository.js";

export interface Bucket {
  count: number;
  totalCents: number;
}

export interface CurrencyTotals {
  currency: string;
  issued: Bucket;
  collected: Bucket;
  receivable: Bucket;
}

export class InvoiceService {
  constructor(private readonly repository: InvoiceRepository) {}

  async getInvoice(id: number) {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new InvoiceNotFoundError(id);
    return toInvoiceView(invoice);
  }

  async getClientInvoices(clientName: string, limit: number) {
    const { invoices, truncated } = await this.repository.findByClientName(clientName, limit);
    return { count: invoices.length, truncated, invoices: invoices.map(toInvoiceView) };
  }

  /**
   * Issued = sent + paid, collected = paid, receivable = sent. One entry per currency: amounts of different currencies
   * are never added (there is no conversion).
   */
  async getSummaryTotals(currency?: string): Promise<CurrencyTotals[]> {
    const rows = await this.repository.findIssued(currency);
    const byCurrency = new Map<string, CurrencyTotals>();
    for (const row of rows) {
      const entry =
        byCurrency.get(row.currency) ??
        { currency: row.currency, issued: bucket(), collected: bucket(), receivable: bucket() };
      byCurrency.set(row.currency, entry);
      const { totalCents } = calcTotals(row.items, row.taxRate);
      add(entry.issued, totalCents);
      if (row.status === "PAID") add(entry.collected, totalCents);
      else add(entry.receivable, totalCents);
    }
    return [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency));
  }
}

const bucket = (): Bucket => ({ count: 0, totalCents: 0 });

function add(target: Bucket, totalCents: number): void {
  target.count += 1;
  target.totalCents += totalCents;
}

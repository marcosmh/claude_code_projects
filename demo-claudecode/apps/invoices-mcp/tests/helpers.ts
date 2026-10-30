import type { InvoiceRecord, InvoiceTotalsRow } from "../src/domain/types.js";
import type { InvoiceRepository } from "../src/services/InvoiceRepository.js";

export const invoice = (over: Partial<InvoiceRecord> = {}): InvoiceRecord => ({
  id: 7,
  number: "FAC-0007",
  clientName: "ACME SA",
  clientEmail: "acme@example.com",
  clientAddress: "Calle 1",
  issueDate: "2026-09-29T00:00:00.000Z",
  dueDate: "2026-11-02T00:00:00.000Z",
  status: "SENT",
  taxRate: 16,
  currency: "MXN",
  notes: null,
  items: [
    { description: "Servicio", quantity: 1, unitPriceCents: 40000 },
    { description: "Soporte", quantity: 2, unitPriceCents: 50000 },
  ],
  ...over,
});

export const row = (over: Partial<InvoiceTotalsRow> = {}): InvoiceTotalsRow => ({
  status: "SENT",
  currency: "MXN",
  taxRate: 0,
  items: [{ quantity: 1, unitPriceCents: 10000 }],
  ...over,
});

export class FakeRepository implements InvoiceRepository {
  calls: unknown[][] = [];
  constructor(
    private readonly data: { invoices?: InvoiceRecord[]; rows?: InvoiceTotalsRow[]; truncated?: boolean; fail?: Error } = {},
  ) {}

  async findById(id: number) {
    this.calls.push(["findById", id]);
    if (this.data.fail) throw this.data.fail;
    return this.data.invoices?.find((i) => i.id === id) ?? null;
  }

  async findByClientName(name: string, limit: number) {
    this.calls.push(["findByClientName", name, limit]);
    if (this.data.fail) throw this.data.fail;
    return { invoices: this.data.invoices ?? [], truncated: this.data.truncated ?? false };
  }

  async findIssued(currency?: string) {
    this.calls.push(["findIssued", currency]);
    if (this.data.fail) throw this.data.fail;
    return (this.data.rows ?? []).filter((r) => !currency || r.currency === currency);
  }
}

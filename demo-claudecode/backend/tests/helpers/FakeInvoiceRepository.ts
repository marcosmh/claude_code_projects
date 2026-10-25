import type { InvoiceRepository } from "../../src/repositories/InvoiceRepository";
import type {
  CreateInvoiceInput,
  FindAllInvoicesOptions,
  Invoice,
  InvoiceData,
  PaginatedInvoices,
} from "../../src/types";

export class FakeInvoiceRepository implements InvoiceRepository {
  readonly rows = new Map<number, Invoice>();
  private nextId = 1;
  private nextItemId = 1;

  private build(id: number, number: string, input: InvoiceData, createdAt = new Date()): Invoice {
    return {
      id,
      number,
      clientName: input.clientName,
      clientEmail: input.clientEmail ?? null,
      clientAddress: input.clientAddress ?? null,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      status: input.status,
      taxRate: input.taxRate,
      notes: input.notes ?? null,
      items: input.items.map((i) => ({ id: this.nextItemId++, ...i })),
      createdAt,
      updatedAt: new Date(),
    };
  }

  async findAll({ filters, pagination }: FindAllInvoicesOptions = {}): Promise<PaginatedInvoices> {
    const term = filters?.search?.trim().toLowerCase();
    const all = [...this.rows.values()]
      .filter((i) => !filters?.status || i.status === filters.status)
      .filter(
        (i) => !term || i.clientName.toLowerCase().includes(term) || i.number.toLowerCase().includes(term),
      )
      .sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime() || b.id - a.id);
    const data = pagination
      ? all.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize)
      : all;
    return { data, total: all.length };
  }

  async findById(id: number) {
    return this.rows.get(id) ?? null;
  }

  async create(input: CreateInvoiceInput) {
    const invoice = this.build(this.nextId++, input.number, input);
    this.rows.set(invoice.id, invoice);
    return invoice;
  }

  async createWithNumber(input: Omit<CreateInvoiceInput, "number">, buildNumber: (id: number) => string) {
    const id = this.nextId++;
    const invoice = this.build(id, buildNumber(id), input);
    this.rows.set(id, invoice);
    return invoice;
  }

  async update(id: number, input: InvoiceData) {
    const current = this.rows.get(id);
    if (!current) return null;
    const invoice = this.build(id, current.number, input, current.createdAt);
    this.rows.set(id, invoice);
    return invoice;
  }

  async delete(id: number) {
    return this.rows.delete(id);
  }
}

export const sampleData = (over: Partial<InvoiceData> = {}): InvoiceData => ({
  clientName: "Cliente",
  issueDate: new Date("2026-09-01T00:00:00Z"),
  dueDate: new Date("2026-10-01T00:00:00Z"),
  status: "DRAFT",
  taxRate: 10,
  items: [{ description: "Servicio", quantity: 2, unitPriceCents: 10000 }],
  ...over,
});

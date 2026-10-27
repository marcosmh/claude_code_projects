import type { InvoiceRepository } from "../../src/repositories/InvoiceRepository";
import type {
  CreateInvoiceInput,
  FindAllInvoicesOptions,
  Invoice,
  InvoiceData,
  InvoiceStatsRow,
  PaginatedInvoices,
  StatsRowsOptions,
} from "../../src/types";

export class FakeInvoiceRepository implements InvoiceRepository {
  readonly rows = new Map<number, Invoice>();
  /** invoice id -> owner id (the domain Invoice does not carry it). */
  readonly owners = new Map<number, number>();
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

  private owned(ownerId: number): Invoice[] {
    return [...this.rows.values()].filter((i) => this.owners.get(i.id) === ownerId);
  }

  async findAll(ownerId: number, { filters, pagination }: FindAllInvoicesOptions = {}): Promise<PaginatedInvoices> {
    const term = filters?.search?.trim().toLowerCase();
    const all = this.owned(ownerId)
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

  /** Calls received by findStatsRows, to assert the service bounds its queries. */
  readonly statsCalls: StatsRowsOptions[] = [];

  async findStatsRows(ownerId: number, options: StatsRowsOptions = {}): Promise<InvoiceStatsRow[]> {
    this.statsCalls.push(options);
    return this.owned(ownerId)
      .filter((i) => !options.issuedFrom || i.issueDate >= options.issuedFrom)
      .map(({ status, taxRate, issueDate, dueDate, items }) => ({
        status,
        taxRate,
        issueDate,
        dueDate,
        items: items.map(({ quantity, unitPriceCents }) => ({ quantity, unitPriceCents })),
      }));
  }

  async findById(ownerId: number, id: number) {
    return this.owners.get(id) === ownerId ? (this.rows.get(id) ?? null) : null;
  }

  async create(ownerId: number, input: CreateInvoiceInput) {
    const invoice = this.build(this.nextId++, input.number, input);
    this.rows.set(invoice.id, invoice);
    this.owners.set(invoice.id, ownerId);
    return invoice;
  }

  async createWithNumber(
    ownerId: number,
    input: Omit<CreateInvoiceInput, "number">,
    buildNumber: (id: number) => string,
  ) {
    const id = this.nextId++;
    const invoice = this.build(id, buildNumber(id), input);
    this.rows.set(id, invoice);
    this.owners.set(id, ownerId);
    return invoice;
  }

  async update(ownerId: number, id: number, input: InvoiceData) {
    const current = await this.findById(ownerId, id);
    if (!current) return null;
    const invoice = this.build(id, current.number, input, current.createdAt);
    this.rows.set(id, invoice);
    return invoice;
  }

  async updateStatus(ownerId: number, id: number, status: Invoice["status"]) {
    const current = await this.findById(ownerId, id);
    if (!current) return null;
    const invoice = { ...current, status, updatedAt: new Date() };
    this.rows.set(id, invoice);
    return invoice;
  }

  async delete(ownerId: number, id: number) {
    if (this.owners.get(id) !== ownerId) return false;
    this.owners.delete(id);
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

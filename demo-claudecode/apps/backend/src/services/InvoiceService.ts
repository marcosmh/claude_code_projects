import { buildInvoiceNumber, calcTotals } from "../domain/invoice";
import type {
  InvoiceRequest,
  InvoiceResponse,
  ListInvoicesQuery,
  ListInvoicesResult,
} from "../dto/invoice.dto";
import { toInvoiceResponse } from "../dto/invoice.mapper";
import type { InvoiceRepository } from "../repositories/InvoiceRepository";
import type { InvoiceData, InvoiceStatus } from "../types";
import { NotFoundError, ValidationError, type ErrorDetail } from "../utils/errors";

export class InvoiceService {
  constructor(
    private readonly repository: InvoiceRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(ownerId: number, query: ListInvoicesQuery): Promise<ListInvoicesResult> {
    const { status, search, currency, issuedFrom, issuedTo, minTotalCents, maxTotalCents, page, pageSize } = query;
    const filters = {
      status,
      search,
      currency,
      issuedFrom: issuedFrom ? new Date(issuedFrom) : undefined,
      issuedTo: issuedTo ? new Date(issuedTo) : undefined,
    };
    const { data, total } =
      minTotalCents === undefined && maxTotalCents === undefined
        ? await this.repository.findAll(ownerId, { filters, pagination: { page, pageSize } })
        : await this.listByTotal(ownerId, filters, { minTotalCents, maxTotalCents }, { page, pageSize });
    const now = this.now();
    return {
      data: data.map((invoice) => toInvoiceResponse(invoice, now)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Totals are derived (never stored), so a range on the total cannot be a SQL condition:
   * load the owner's matches for the other filters, keep those in range and paginate here.
   */
  private async listByTotal(
    ownerId: number,
    filters: NonNullable<Parameters<InvoiceRepository["findAll"]>[1]>["filters"],
    { minTotalCents, maxTotalCents }: { minTotalCents?: number; maxTotalCents?: number },
    { page, pageSize }: { page: number; pageSize: number },
  ) {
    const { data: candidates } = await this.repository.findAll(ownerId, { filters });
    const inRange = candidates.filter(({ items, taxRate }) => {
      const { totalCents } = calcTotals(items, taxRate);
      return (minTotalCents === undefined || totalCents >= minTotalCents) && (maxTotalCents === undefined || totalCents <= maxTotalCents);
    });
    return { data: inRange.slice((page - 1) * pageSize, page * pageSize), total: inRange.length };
  }

  async getById(ownerId: number, id: number): Promise<InvoiceResponse> {
    return toInvoiceResponse(await this.findOrFail(ownerId, id), this.now());
  }

  async create(ownerId: number, request: InvoiceRequest): Promise<InvoiceResponse> {
    const data = this.toInvoiceData(request);
    const invoice = await this.repository.createWithNumber(ownerId, data, buildInvoiceNumber);
    return toInvoiceResponse(invoice, this.now());
  }

  async update(ownerId: number, id: number, request: InvoiceRequest): Promise<InvoiceResponse> {
    const data = this.toInvoiceData(request);
    const invoice = await this.repository.update(ownerId, id, data);
    if (!invoice) throw new NotFoundError(`Factura ${id} no encontrada`);
    return toInvoiceResponse(invoice, this.now());
  }

  async updateStatus(ownerId: number, id: number, status: InvoiceStatus): Promise<InvoiceResponse> {
    const invoice = await this.repository.updateStatus(ownerId, id, status);
    if (!invoice) throw new NotFoundError(`Factura ${id} no encontrada`);
    return toInvoiceResponse(invoice, this.now());
  }

  async delete(ownerId: number, id: number): Promise<void> {
    const deleted = await this.repository.delete(ownerId, id);
    if (!deleted) throw new NotFoundError(`Factura ${id} no encontrada`);
  }

  private async findOrFail(ownerId: number, id: number) {
    const invoice = await this.repository.findById(ownerId, id);
    if (!invoice) throw new NotFoundError(`Factura ${id} no encontrada`);
    return invoice;
  }

  /** Applies the business rules and converts the request into persistence data. */
  private toInvoiceData(request: InvoiceRequest): InvoiceData {
    const issueDate = new Date(request.issueDate);
    const dueDate = new Date(request.dueDate);
    this.assertRules(request, issueDate, dueDate);
    return {
      clientName: request.clientName,
      clientEmail: request.clientEmail,
      clientAddress: request.clientAddress,
      issueDate,
      dueDate,
      status: request.status,
      taxRate: request.taxRate,
      currency: request.currency,
      notes: request.notes,
      items: request.items.map(({ description, quantity, unitPriceCents }) => ({
        description,
        quantity,
        unitPriceCents,
      })),
    };
  }

  private assertRules(request: InvoiceRequest, issueDate: Date, dueDate: Date): void {
    const details: ErrorDetail[] = [];
    if (dueDate < issueDate) {
      details.push({
        field: "dueDate",
        message: "El vencimiento no puede ser anterior a la emisión",
      });
    }
    if (request.items.length === 0) {
      details.push({ field: "items", message: "Agrega al menos una línea" });
    }
    request.items.forEach((item, index) => {
      if (!(item.quantity > 0)) {
        details.push({
          field: `items.${index}.quantity`,
          message: "La cantidad debe ser mayor que 0",
        });
      }
    });
    if (details.length > 0) {
      throw new ValidationError("La factura incumple reglas de negocio", details);
    }
  }
}

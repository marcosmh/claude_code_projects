import { buildInvoiceNumber } from "../domain/invoice";
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

  async list(query: ListInvoicesQuery): Promise<ListInvoicesResult> {
    const { status, search, page, pageSize } = query;
    const { data, total } = await this.repository.findAll({
      filters: { status, search },
      pagination: { page, pageSize },
    });
    const now = this.now();
    return {
      data: data.map((invoice) => toInvoiceResponse(invoice, now)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getById(id: number): Promise<InvoiceResponse> {
    return toInvoiceResponse(await this.findOrFail(id), this.now());
  }

  async create(request: InvoiceRequest): Promise<InvoiceResponse> {
    const data = this.toInvoiceData(request);
    const invoice = await this.repository.createWithNumber(data, buildInvoiceNumber);
    return toInvoiceResponse(invoice, this.now());
  }

  async update(id: number, request: InvoiceRequest): Promise<InvoiceResponse> {
    const data = this.toInvoiceData(request);
    const invoice = await this.repository.update(id, data);
    if (!invoice) throw new NotFoundError(`Factura ${id} no encontrada`);
    return toInvoiceResponse(invoice, this.now());
  }

  async updateStatus(id: number, status: InvoiceStatus): Promise<InvoiceResponse> {
    const invoice = await this.repository.updateStatus(id, status);
    if (!invoice) throw new NotFoundError(`Factura ${id} no encontrada`);
    return toInvoiceResponse(invoice, this.now());
  }

  async delete(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError(`Factura ${id} no encontrada`);
  }

  private async findOrFail(id: number) {
    const invoice = await this.repository.findById(id);
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

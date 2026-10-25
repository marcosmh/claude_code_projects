import type { InvoicePdfService } from "../services/InvoicePdfService";
import type { InvoiceService } from "../services/InvoiceService";
import { created, noContent, ok } from "../utils/http";
import {
  invoiceBodySchema,
  listQuerySchema,
  statusBodySchema,
} from "../validators/invoice.validator";
import { parseBody, parseId, parseQuery } from "./requestParsers";

export class InvoiceController {
  constructor(
    private readonly invoices: InvoiceService,
    private readonly pdfs: InvoicePdfService,
  ) {}

  async list(ownerId: number, request: Request): Promise<Response> {
    const { data, meta } = await this.invoices.list(ownerId, parseQuery(listQuerySchema, request));
    return ok(data, meta);
  }

  async get(ownerId: number, id: string): Promise<Response> {
    return ok(await this.invoices.getById(ownerId, parseId(id)));
  }

  async create(ownerId: number, request: Request): Promise<Response> {
    const invoice = await this.invoices.create(ownerId, await parseBody(invoiceBodySchema, request));
    return created(invoice, `/api/v1/invoices/${invoice.id}`);
  }

  async update(ownerId: number, id: string, request: Request): Promise<Response> {
    const body = await parseBody(invoiceBodySchema, request);
    return ok(await this.invoices.update(ownerId, parseId(id), body));
  }

  async updateStatus(ownerId: number, id: string, request: Request): Promise<Response> {
    const { status } = await parseBody(statusBodySchema, request);
    return ok(await this.invoices.updateStatus(ownerId, parseId(id), status));
  }

  async remove(ownerId: number, id: string): Promise<Response> {
    await this.invoices.delete(ownerId, parseId(id));
    return noContent();
  }

  async pdf(ownerId: number, id: string): Promise<Response> {
    const { filename, content } = await this.pdfs.generate(ownerId, parseId(id));
    return new Response(content as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  }
}

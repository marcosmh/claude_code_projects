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

  async list(request: Request): Promise<Response> {
    const { data, meta } = await this.invoices.list(parseQuery(listQuerySchema, request));
    return ok(data, meta);
  }

  async get(id: string): Promise<Response> {
    return ok(await this.invoices.getById(parseId(id)));
  }

  async create(request: Request): Promise<Response> {
    const invoice = await this.invoices.create(await parseBody(invoiceBodySchema, request));
    return created(invoice, `/api/v1/invoices/${invoice.id}`);
  }

  async update(id: string, request: Request): Promise<Response> {
    const body = await parseBody(invoiceBodySchema, request);
    return ok(await this.invoices.update(parseId(id), body));
  }

  async updateStatus(id: string, request: Request): Promise<Response> {
    const { status } = await parseBody(statusBodySchema, request);
    return ok(await this.invoices.updateStatus(parseId(id), status));
  }

  async remove(id: string): Promise<Response> {
    await this.invoices.delete(parseId(id));
    return noContent();
  }

  async pdf(id: string): Promise<Response> {
    const { filename, content } = await this.pdfs.generate(parseId(id));
    return new Response(content as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  }
}

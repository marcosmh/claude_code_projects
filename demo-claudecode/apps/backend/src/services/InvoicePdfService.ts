import type { PdfRenderer } from "../pdf/ReactPdfRenderer";
import type { InvoiceService } from "./InvoiceService";

export interface InvoicePdf {
  filename: string;
  content: Uint8Array;
}

export class InvoicePdfService {
  constructor(
    private readonly invoices: Pick<InvoiceService, "getById">,
    private readonly renderer: PdfRenderer,
  ) {}

  async generate(ownerId: number, id: number): Promise<InvoicePdf> {
    const invoice = await this.invoices.getById(ownerId, id);
    return { filename: `${invoice.number}.pdf`, content: await this.renderer.render(invoice) };
  }
}

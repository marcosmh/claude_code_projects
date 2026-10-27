import { renderToBuffer } from "@react-pdf/renderer";
import type { InvoiceResponse } from "../dto/invoice.dto";
import { InvoiceDocument } from "./InvoiceDocument";

/** Turns an invoice into PDF bytes. The service depends on this port, not on react-pdf. */
export interface PdfRenderer {
  render(invoice: InvoiceResponse): Promise<Uint8Array>;
}

export class ReactPdfRenderer implements PdfRenderer {
  async render(invoice: InvoiceResponse): Promise<Uint8Array> {
    return new Uint8Array(await renderToBuffer(InvoiceDocument({ invoice })));
  }
}

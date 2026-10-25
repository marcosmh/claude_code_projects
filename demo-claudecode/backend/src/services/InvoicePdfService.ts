import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "../pdf/InvoiceDocument";
import type { InvoiceService } from "./InvoiceService";

export interface InvoicePdf {
  filename: string;
  content: Uint8Array;
}

export class InvoicePdfService {
  constructor(private readonly invoices: Pick<InvoiceService, "getById">) {}

  async generate(id: number): Promise<InvoicePdf> {
    const invoice = await this.invoices.getById(id);
    const buffer = await renderToBuffer(InvoiceDocument({ invoice }));
    return { filename: `${invoice.number}.pdf`, content: new Uint8Array(buffer) };
  }
}

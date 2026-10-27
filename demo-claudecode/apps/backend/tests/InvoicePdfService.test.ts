import { describe, expect, it, vi } from "vitest";
import type { PdfRenderer } from "../src/pdf/ReactPdfRenderer";
import { InvoicePdfService } from "../src/services/InvoicePdfService";
import { InvoiceService } from "../src/services/InvoiceService";
import { NotFoundError } from "../src/utils/errors";
import { FakeInvoiceRepository, sampleData } from "./helpers/FakeInvoiceRepository";

describe("InvoicePdfService", () => {
  const setup = async () => {
    const repo = new FakeInvoiceRepository();
    const invoice = await repo.createWithNumber(1, sampleData(), (id) => `FAC-000${id}`);
    const render = vi.fn<PdfRenderer["render"]>().mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    const service = new InvoicePdfService(new InvoiceService(repo), { render });
    return { service, render, invoice };
  };

  it("pide al renderizador la factura ya con totales y nombra el archivo con su número", async () => {
    const { service, render, invoice } = await setup();
    const pdf = await service.generate(1, invoice.id);
    expect(pdf.filename).toBe("FAC-0001.pdf");
    expect(Array.from(pdf.content)).toEqual([37, 80, 68, 70]);
    expect(render).toHaveBeenCalledWith(expect.objectContaining({ number: "FAC-0001", totalCents: 22000 }));
  });

  it("la factura de otro usuario es un NotFound y no se llega a renderizar", async () => {
    const { service, render, invoice } = await setup();
    await expect(service.generate(2, invoice.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(render).not.toHaveBeenCalled();
  });

  it("si el renderizador falla, el error se propaga", async () => {
    const { service, render, invoice } = await setup();
    render.mockRejectedValue(new Error("boom"));
    await expect(service.generate(1, invoice.id)).rejects.toThrow("boom");
  });
});

import { describe, expect, it } from "vitest";
import { InvoiceNotFoundError } from "../src/domain/types.js";
import { InvoiceService } from "../src/services/InvoiceService.js";
import { FakeRepository, invoice, row } from "./helpers.js";

describe("InvoiceService", () => {
  it("getInvoice devuelve la factura con sus importes derivados", async () => {
    const view = await new InvoiceService(new FakeRepository({ invoices: [invoice()] })).getInvoice(7);
    expect(view.totalCents).toBe(162400);
  });

  it("getInvoice lanza InvoiceNotFoundError si no existe", async () => {
    await expect(new InvoiceService(new FakeRepository()).getInvoice(99)).rejects.toThrow(InvoiceNotFoundError);
  });

  it("getClientInvoices cuenta, marca el truncado y calcula cada factura", async () => {
    const repo = new FakeRepository({ invoices: [invoice(), invoice({ id: 8 })], truncated: true });
    const result = await new InvoiceService(repo).getClientInvoices("acme", 2);
    expect(result).toMatchObject({ count: 2, truncated: true });
    expect(result.invoices[1]?.totalCents).toBe(162400);
    expect(repo.calls).toEqual([["findByClientName", "acme", 2]]);
  });

  it("getSummaryTotals: emitidas = enviadas + pagadas, cobradas = pagadas, por cobrar = enviadas", async () => {
    const service = new InvoiceService(
      new FakeRepository({
        rows: [
          row({ status: "SENT" }),
          row({ status: "PAID", items: [{ quantity: 2, unitPriceCents: 5000 }] }),
          row({ status: "PAID", taxRate: 16 }),
        ],
      }),
    );
    expect(await service.getSummaryTotals()).toEqual([
      {
        currency: "MXN",
        issued: { count: 3, totalCents: 10000 + 10000 + 11600 },
        collected: { count: 2, totalCents: 10000 + 11600 },
        receivable: { count: 1, totalCents: 10000 },
      },
    ]);
  });

  it("getSummaryTotals nunca mezcla monedas y las ordena", async () => {
    const service = new InvoiceService(new FakeRepository({ rows: [row({ currency: "USD" }), row({ currency: "EUR" }), row()] }));
    const totals = await service.getSummaryTotals();
    expect(totals.map((t) => t.currency)).toEqual(["EUR", "MXN", "USD"]);
    expect(totals.every((t) => t.issued.count === 1)).toBe(true);
  });

  it("getSummaryTotals pasa la moneda al repositorio y devuelve vacío sin facturas", async () => {
    const repo = new FakeRepository();
    expect(await new InvoiceService(repo).getSummaryTotals("USD")).toEqual([]);
    expect(repo.calls).toEqual([["findIssued", "USD"]]);
  });

  it("una factura sin líneas suma cero", async () => {
    const totals = await new InvoiceService(new FakeRepository({ rows: [row({ items: [] })] })).getSummaryTotals();
    expect(totals[0]?.issued).toEqual({ count: 1, totalCents: 0 });
  });
});

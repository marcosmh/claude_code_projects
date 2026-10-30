import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "../src/domain/types.js";
import { createServer } from "../src/server.js";
import { InvoiceService } from "../src/services/InvoiceService.js";
import type { InvoiceRepository } from "../src/services/InvoiceRepository.js";
import { FakeRepository, invoice, row } from "./helpers.js";

async function connect(repository: InvoiceRepository) {
  const server = createServer(new InvoiceService(repository));
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const textOf = (r: Awaited<ReturnType<Client["callTool"]>>) =>
  (r.content as { type: string; text: string }[]).map((c) => c.text).join("\n");

let client: Client | undefined;
afterEach(async () => {
  await client?.close();
  client = undefined;
  vi.restoreAllMocks();
});

describe("invoices-mcp server", () => {
  it("expone las tres herramientas, todas de solo lectura y sin acceso a internet", async () => {
    client = await connect(new FakeRepository());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_client_invoice", "get_invoice_summary", "get_summary_totals"]);
    for (const t of tools) {
      expect(t.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, openWorldHint: false });
    }
  });

  it("get_invoice_summary devuelve cliente, líneas con subtotal y total", async () => {
    client = await connect(new FakeRepository({ invoices: [invoice()] }));
    const r = await client.callTool({ name: "get_invoice_summary", arguments: { id: 7 } });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent).toMatchObject({
      clientName: "ACME SA",
      lines: [
        { description: "Servicio", quantity: 1, unitPriceCents: 40000, subtotalCents: 40000 },
        { description: "Soporte", quantity: 2, unitPriceCents: 50000, subtotalCents: 100000 },
      ],
      totalCents: 162400,
    });
    const text = textOf(r);
    expect(text).toContain("Cliente: ACME SA");
    expect(text).toContain("2. Soporte: 2 × 500.00 MXN = 1,000.00 MXN");
    expect(text).toContain("Total: 1,624.00 MXN");
  });

  it("get_invoice_summary indica cuando no hay líneas", async () => {
    client = await connect(new FakeRepository({ invoices: [invoice({ items: [] })] }));
    expect(textOf(await client.callTool({ name: "get_invoice_summary", arguments: { id: 7 } }))).toContain("(sin líneas)");
  });

  it("get_invoice_summary con una id inexistente es un error legible", async () => {
    client = await connect(new FakeRepository());
    const r = await client.callTool({ name: "get_invoice_summary", arguments: { id: 99 } });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toBe("No existe una factura con id 99");
  });

  it.each([{ id: 0 }, { id: -1 }, { id: 1.5 }, { id: "7" }, {}])("get_invoice_summary rechaza la entrada %j", async (args) => {
    client = await connect(new FakeRepository({ invoices: [invoice()] }));
    const r = await client.callTool({ name: "get_invoice_summary", arguments: args });
    expect(r.isError).toBe(true);
  });

  it("get_client_invoice devuelve el JSON completo, también en el texto", async () => {
    const repo = new FakeRepository({ invoices: [invoice(), invoice({ id: 8, number: "FAC-0008" })] });
    client = await connect(repo);
    const r = await client.callTool({ name: "get_client_invoice", arguments: { clientName: " acme " } });
    expect(repo.calls).toEqual([["findByClientName", "acme", 50]]);
    const parsed = JSON.parse(textOf(r));
    expect(parsed).toMatchObject({ clientName: "acme", count: 2, truncated: false });
    expect(parsed.invoices[1]).toMatchObject({ number: "FAC-0008", totalCents: 162400, lines: [{ subtotalCents: 40000 }, { subtotalCents: 100000 }] });
    expect(r.structuredContent).toEqual(parsed);
  });

  it.each([{ clientName: "" }, { clientName: "   " }, { clientName: "a", limit: 0 }, { clientName: "a", limit: 201 }])(
    "get_client_invoice rechaza la entrada %j",
    async (args) => {
      client = await connect(new FakeRepository());
      expect((await client.callTool({ name: "get_client_invoice", arguments: args })).isError).toBe(true);
    },
  );

  it("get_summary_totals devuelve emitidas, cobradas y por cobrar por moneda", async () => {
    client = await connect(new FakeRepository({ rows: [row({ status: "SENT" }), row({ status: "PAID" }), row({ currency: "USD" })] }));
    const r = await client.callTool({ name: "get_summary_totals", arguments: {} });
    expect(r.structuredContent).toMatchObject({
      totals: [
        { currency: "MXN", issued: { count: 2, totalCents: 20000 }, collected: { count: 1, totalCents: 10000 }, receivable: { count: 1, totalCents: 10000 } },
        { currency: "USD", issued: { count: 1 } },
      ],
    });
    const text = textOf(r);
    expect(text).toContain("Total emitidas: 200.00 MXN (2 facturas)");
    expect(text).toContain("Total cobradas: 100.00 MXN (1 facturas)");
    expect(text).toContain("Total por cobrar: 100.00 MXN (1 facturas)");
  });

  it("get_summary_totals filtra por moneda y avisa cuando no hay nada", async () => {
    client = await connect(new FakeRepository());
    const r = await client.callTool({ name: "get_summary_totals", arguments: { currency: "EUR" } });
    expect(textOf(r)).toBe("No hay facturas emitidas");
    expect((await client.callTool({ name: "get_summary_totals", arguments: { currency: "GBP" } })).isError).toBe(true);
  });

  it("un error de la base se informa sin detalles", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    client = await connect(new FakeRepository({ fail: new DatabaseUnavailableError() }));
    const r = await client.callTool({ name: "get_summary_totals", arguments: {} });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toBe("No se pudo consultar la base de datos de facturas");
  });

  it("un error inesperado se registra por stderr y al cliente le llega un mensaje genérico", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    client = await connect(new FakeRepository({ fail: new Error("secret internals") }));
    const r = await client.callTool({ name: "get_invoice_summary", arguments: { id: 1 } });
    expect(textOf(r)).not.toContain("secret internals");
    expect(log).toHaveBeenCalled();
  });
});

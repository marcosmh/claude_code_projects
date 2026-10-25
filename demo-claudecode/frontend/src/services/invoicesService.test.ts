import { afterEach, describe, expect, it, vi } from "vitest";
import type { InvoiceRequest } from "@/types/invoice";
import { API_URL } from "./apiClient";
import { invoicesService } from "./invoicesService";

const json = (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init);

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

const input: InvoiceRequest = {
  clientName: "Acme",
  clientEmail: null,
  clientAddress: null,
  issueDate: "2026-10-01",
  dueDate: "2026-10-20",
  status: "DRAFT",
  taxRate: 16,
  notes: null,
  items: [{ description: "Servicio", quantity: 1, unitPriceCents: 1000 }],
};

describe("invoicesService", () => {
  it("list devuelve items y meta, y omite filtros vacíos de la query", async () => {
    const meta = { page: 1, pageSize: 10, total: 1, totalPages: 1 };
    const fetchMock = stubFetch(json({ data: [{ id: 1 }], meta }));

    const result = await invoicesService.list({ status: "PAID", search: "", page: 1, pageSize: 10 });

    expect(result).toEqual({ items: [{ id: 1 }], meta });
    const url = new URL(fetchMock.mock.calls[0]?.[0] as string);
    expect(url.pathname.endsWith("/invoices")).toBe(true);
    expect(url.searchParams.get("status")).toBe("PAID");
    expect(url.searchParams.has("search")).toBe(false);
  });

  it("list inventa un meta de una página si la API no lo envía", async () => {
    stubFetch(json({ data: [{ id: 1 }, { id: 2 }] }));
    const result = await invoicesService.list({});
    expect(result.meta).toEqual({ page: 1, pageSize: 2, total: 2, totalPages: 1 });
  });

  it("get pide la factura por id", async () => {
    const fetchMock = stubFetch(json({ data: { id: 7 } }));
    await expect(invoicesService.get(7)).resolves.toEqual({ id: 7 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}/invoices/7`);
  });

  it("create hace POST con el cuerpo JSON", async () => {
    const fetchMock = stubFetch(json({ data: { id: 1 } }, { status: 201 }));
    await invoicesService.create(input);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/invoices`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it("update hace PUT a /invoices/:id", async () => {
    const fetchMock = stubFetch(json({ data: { id: 3 } }));
    await invoicesService.update(3, input);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/invoices/3`);
    expect(init.method).toBe("PUT");
  });

  it("setStatus hace PATCH con { status }", async () => {
    const fetchMock = stubFetch(json({ data: { id: 3, status: "SENT" } }));
    await invoicesService.setStatus(3, "SENT");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/invoices/3/status`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ status: "SENT" });
  });

  it("remove hace DELETE y tolera el 204 sin cuerpo", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    await expect(invoicesService.remove(5)).resolves.toBeUndefined();
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe("DELETE");
  });

  it("propaga el ApiError del servidor", async () => {
    stubFetch(json({ error: { code: "NOT_FOUND", message: "No existe" } }, { status: 404 }));
    await expect(invoicesService.get(9)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("pdfUrl apunta al endpoint del PDF", () => {
    expect(invoicesService.pdfUrl(12)).toBe(`${API_URL}/invoices/12/pdf`);
  });
});

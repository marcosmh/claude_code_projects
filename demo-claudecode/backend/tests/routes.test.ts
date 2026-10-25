import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeInvoiceRepository } from "./helpers/FakeInvoiceRepository";

// Route handlers import the container, which imports the Prisma-backed repository: swap it for a fake.
const fake = vi.hoisted(() => ({ repo: undefined as unknown }));
vi.mock("../src/repositories", async () => {
  const { FakeInvoiceRepository } = await import("./helpers/FakeInvoiceRepository");
  fake.repo = new FakeInvoiceRepository();
  return { invoiceRepository: fake.repo };
});

import * as listRoute from "@/app/api/v1/invoices/route";
import * as itemRoute from "@/app/api/v1/invoices/[id]/route";
import * as statusRoute from "@/app/api/v1/invoices/[id]/status/route";
import * as pdfRoute from "@/app/api/v1/invoices/[id]/pdf/route";
import * as summaryRoute from "@/app/api/v1/stats/summary/route";
import * as monthlyRoute from "@/app/api/v1/stats/monthly/route";

const BASE = "http://localhost:4000/api/v1";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (method: string, url: string, body?: unknown) =>
  new Request(`${BASE}${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const body = (over: Record<string, unknown> = {}) => ({
  clientName: "Acme",
  issueDate: "2026-09-01",
  dueDate: "2026-10-01",
  taxRate: 10,
  items: [{ description: "A", quantity: 2, unitPriceCents: 10000 }],
  ...over,
});

async function createOne(over: Record<string, unknown> = {}) {
  const res = await listRoute.POST(json("POST", "/invoices", body(over)));
  return (await res.json()).data as { id: number };
}

beforeEach(() => (fake.repo as FakeInvoiceRepository).rows.clear());

describe("invoices routes", () => {
  it("POST crea (201 + Location) y GET devuelve { data }", async () => {
    const res = await listRoute.POST(json("POST", "/invoices", body()));
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(res.headers.get("Location")).toBe(`/api/v1/invoices/${data.id}`);
    expect(data).toMatchObject({ number: expect.stringMatching(/^FAC-\d{4}$/), totalCents: 22000, status: "DRAFT" });

    const got = await itemRoute.GET(json("GET", `/invoices/${data.id}`), ctx(String(data.id)));
    expect(got.status).toBe(200);
    expect((await got.json()).data.id).toBe(data.id);
  });

  it("POST inválido -> 400 con details", async () => {
    const res = await listRoute.POST(json("POST", "/invoices", body({ clientName: "", issueDate: "x" })));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details.map((d: { field: string }) => d.field)).toEqual(expect.arrayContaining(["clientName", "issueDate"]));
  });

  it("POST con JSON roto -> 400", async () => {
    const res = await listRoute.POST(json("POST", "/invoices", "{nope"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", ""])(
    "POST con Content-Type %j -> 400 sin procesar el cuerpo",
    async (contentType) => {
      const req = new Request(`${BASE}/invoices`, {
        method: "POST",
        headers: contentType ? { "Content-Type": contentType } : undefined,
        body: JSON.stringify(body()),
      });
      const res = await listRoute.POST(req);
      expect(res.status).toBe(400);
      expect((await res.json()).error.message).toMatch(/application\/json/);
    },
  );

  it("POST acepta application/json con charset", async () => {
    const req = new Request(`${BASE}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body()),
    });
    expect((await listRoute.POST(req)).status).toBe(201);
  });

  it("POST que viola regla de negocio -> 422", async () => {
    const res = await listRoute.POST(json("POST", "/invoices", body({ dueDate: "2026-08-01" })));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("UNPROCESSABLE_ENTITY");
  });

  it("GET lista con meta y filtros", async () => {
    await createOne();
    await createOne({ status: "PAID" });
    const res = await listRoute.GET(json("GET", "/invoices?status=PAID&page=1&pageSize=5"));
    const payload = await res.json();
    expect(payload.data).toHaveLength(1);
    expect(payload.meta).toEqual({ page: 1, pageSize: 5, total: 1, totalPages: 1 });
    expect((await listRoute.GET(json("GET", "/invoices?status=BAD"))).status).toBe(400);
  });

  it("GET id inexistente 404 e id inválido 400", async () => {
    const nf = await itemRoute.GET(json("GET", "/invoices/99"), ctx("99"));
    expect(nf.status).toBe(404);
    expect((await nf.json()).error.code).toBe("NOT_FOUND");
    expect((await itemRoute.GET(json("GET", "/invoices/abc"), ctx("abc"))).status).toBe(400);
  });

  it("PUT, PATCH status y DELETE 204", async () => {
    const { id } = await createOne();
    const put = await itemRoute.PUT(json("PUT", `/invoices/${id}`, body({ clientName: "Nuevo" })), ctx(String(id)));
    expect((await put.json()).data.clientName).toBe("Nuevo");

    const patch = await statusRoute.PATCH(json("PATCH", `/invoices/${id}/status`, { status: "SENT" }), ctx(String(id)));
    const patched = (await patch.json()).data;
    expect(patched.status).toBe("SENT");
    expect(patched.isOverdue).toBe(true);
    const badPatch = await statusRoute.PATCH(json("PATCH", `/invoices/${id}/status`, { status: "OVERDUE" }), ctx(String(id)));
    expect(badPatch.status).toBe(400);

    const del = await itemRoute.DELETE(json("DELETE", `/invoices/${id}`), ctx(String(id)));
    expect(del.status).toBe(204);
    expect(await del.text()).toBe("");
    expect((await itemRoute.DELETE(json("DELETE", `/invoices/${id}`), ctx(String(id)))).status).toBe(404);
    expect((await itemRoute.PUT(json("PUT", `/invoices/${id}`, body()), ctx(String(id)))).status).toBe(404);
  });

  it("PDF devuelve application/pdf", async () => {
    const { id } = await createOne();
    const res = await pdfRoute.GET(json("GET", `/invoices/${id}/pdf`), ctx(String(id)));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("FAC-");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    expect((await pdfRoute.GET(json("GET", "/invoices/99/pdf"), ctx("99"))).status).toBe(404);
  });
});

describe("stats routes", () => {
  it("summary y monthly", async () => {
    await createOne({ status: "SENT" });
    const summary = (await (await summaryRoute.GET()).json()).data;
    expect(summary.totalCount).toBe(1);
    expect(summary.byStatus.SENT.count).toBe(1);

    const monthly = await (await monthlyRoute.GET(json("GET", "/stats/monthly?months=3"))).json();
    expect(monthly.data).toHaveLength(3);
    expect(monthly.meta).toEqual({ months: 3 });
    expect((await monthlyRoute.GET(json("GET", "/stats/monthly?months=0"))).status).toBe(400);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import type { InvoiceRequest } from "../src/dto/invoice.dto";
import { InvoiceService } from "../src/services/InvoiceService";
import { NotFoundError, ValidationError } from "../src/utils/errors";
import { FakeInvoiceRepository, sampleData } from "./helpers/FakeInvoiceRepository";

const NOW = new Date("2026-10-10T12:00:00Z");
const U = 1;
const OTHER = 2;

const request = (over: Partial<InvoiceRequest> = {}): InvoiceRequest => ({
  clientName: "Acme",
  clientEmail: null,
  clientAddress: null,
  issueDate: "2026-09-01",
  dueDate: "2026-10-01",
  status: "DRAFT",
  taxRate: 10,
  currency: "USD",
  notes: null,
  items: [
    { description: "A", quantity: 2, unitPriceCents: 10000 },
    { description: "B", quantity: 1.5, unitPriceCents: 999 },
  ],
  ...over,
});

let repo: FakeInvoiceRepository;
let service: InvoiceService;
beforeEach(() => {
  repo = new FakeInvoiceRepository();
  service = new InvoiceService(repo, () => NOW);
});

describe("InvoiceService.create", () => {
  it("asigna número FAC-0001 y calcula totales", async () => {
    const created = await service.create(U, request());
    expect(created.number).toBe("FAC-0001");
    expect(created.subtotalCents).toBe(21499);
    expect(created.taxCents).toBe(2150);
    expect(created.totalCents).toBe(23649);
    expect(created.items.map((i) => i.amountCents)).toEqual([20000, 1499]);
    expect(created.issueDate).toBe("2026-09-01T00:00:00.000Z");
  });

  it("el número no se repite tras borrar", async () => {
    const a = await service.create(U, request());
    await service.delete(U, a.id);
    expect((await service.create(U, request())).number).toBe("FAC-0002");
  });

  it("rechaza vencimiento anterior a la emisión", async () => {
    const err = await service.create(U, request({ dueDate: "2026-08-01" })).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details[0].field).toBe("dueDate");
    expect(repo.rows.size).toBe(0);
  });

  it("acepta vencimiento igual a la emisión", async () => {
    await expect(service.create(U, request({ dueDate: "2026-09-01" }))).resolves.toBeDefined();
  });

  it("rechaza cantidades <= 0 y listas vacías", async () => {
    const bad = request({ items: [{ description: "A", quantity: 0, unitPriceCents: 1 }] });
    await expect(service.create(U, bad)).rejects.toBeInstanceOf(ValidationError);
    await expect(service.create(U, request({ items: [] }))).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("InvoiceService lectura/modificación", () => {
  it("getById y NotFound", async () => {
    const { id } = await service.create(U, request());
    expect((await service.getById(U, id)).id).toBe(id);
    await expect(service.getById(U, 999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update reemplaza campos e items; 404 si no existe", async () => {
    const { id } = await service.create(U, request());
    const updated = await service.update(U, id, request({ clientName: "Otro", items: [{ description: "Z", quantity: 1, unitPriceCents: 500 }] }));
    expect(updated.clientName).toBe("Otro");
    expect(updated.items).toHaveLength(1);
    expect(updated.number).toBe("FAC-0001");
    await expect(service.update(U, 999, request())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updateStatus solo cambia el estado", async () => {
    const created = await service.create(U, request());
    const { id, totalCents } = created;
    const r = await service.updateStatus(U, id, "PAID");
    expect(r.status).toBe("PAID");
    expect(r.totalCents).toBe(totalCents);
    expect(r.items).toHaveLength(2);
    expect(r.items.map((i) => i.id)).toEqual(created.items.map((i) => i.id));
    await expect(service.updateStatus(U, 999, "PAID")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete y NotFound", async () => {
    const { id } = await service.create(U, request());
    await service.delete(U, id);
    await expect(service.delete(U, id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("isOverdue: SENT con vencimiento pasado", async () => {
    const sent = await service.create(U, request({ status: "SENT" }));
    const paid = await service.create(U, request({ status: "PAID" }));
    expect(sent.isOverdue).toBe(true);
    expect(paid.isOverdue).toBe(false);
  });

  it("list filtra, busca y pagina con meta", async () => {
    for (let i = 0; i < 5; i++) await service.create(U, request({ clientName: i < 2 ? "Beta SA" : "Acme", status: i === 0 ? "SENT" : "DRAFT" }));
    const page = await service.list(U, { page: 2, pageSize: 2 });
    expect(page.data).toHaveLength(2);
    expect(page.meta).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
    expect((await service.list(U, { page: 1, pageSize: 10, status: "SENT" })).meta.total).toBe(1);
    expect((await service.list(U, { page: 1, pageSize: 10, search: "beta" })).meta.total).toBe(2);
    expect((await service.list(U, { page: 1, pageSize: 10, search: "FAC-0003" })).meta.total).toBe(1);
  });
});

describe("repositorio falso", () => {
  it("sampleData es utilizable", async () => {
    const created = await repo.create(U, { ...sampleData(), number: "X" });
    expect(created.items).toHaveLength(1);
  });
});

describe("InvoiceService: aislamiento por propietario", () => {
  it("otro usuario recibe NotFound en get/update/updateStatus/delete y no ve la factura en el listado", async () => {
    const { id } = await service.create(U, request());
    await expect(service.getById(OTHER, id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.update(OTHER, id, request({ clientName: "X" }))).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.updateStatus(OTHER, id, "PAID")).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.delete(OTHER, id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await service.list(OTHER, { page: 1, pageSize: 10 })).meta.total).toBe(0);
    const intact = await service.getById(U, id);
    expect(intact.clientName).toBe("Acme");
    expect(intact.status).toBe("DRAFT");
  });

  it("los números FAC- siguen siendo únicos entre usuarios", async () => {
    const a = await service.create(U, request());
    const b = await service.create(OTHER, request());
    expect(a.number).not.toBe(b.number);
  });
});

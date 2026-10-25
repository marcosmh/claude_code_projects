import { beforeEach, describe, expect, it } from "vitest";
import type { InvoiceRequest } from "../src/dto/invoice.dto";
import { InvoiceService } from "../src/services/InvoiceService";
import { NotFoundError, ValidationError } from "../src/utils/errors";
import { FakeInvoiceRepository, sampleData } from "./helpers/FakeInvoiceRepository";

const NOW = new Date("2026-10-10T12:00:00Z");

const request = (over: Partial<InvoiceRequest> = {}): InvoiceRequest => ({
  clientName: "Acme",
  clientEmail: null,
  clientAddress: null,
  issueDate: "2026-09-01",
  dueDate: "2026-10-01",
  status: "DRAFT",
  taxRate: 10,
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
    const created = await service.create(request());
    expect(created.number).toBe("FAC-0001");
    expect(created.subtotalCents).toBe(21499);
    expect(created.taxCents).toBe(2150);
    expect(created.totalCents).toBe(23649);
    expect(created.items.map((i) => i.amountCents)).toEqual([20000, 1499]);
    expect(created.issueDate).toBe("2026-09-01T00:00:00.000Z");
  });

  it("el número no se repite tras borrar", async () => {
    const a = await service.create(request());
    await service.delete(a.id);
    expect((await service.create(request())).number).toBe("FAC-0002");
  });

  it("rechaza vencimiento anterior a la emisión", async () => {
    const err = await service.create(request({ dueDate: "2026-08-01" })).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details[0].field).toBe("dueDate");
    expect(repo.rows.size).toBe(0);
  });

  it("acepta vencimiento igual a la emisión", async () => {
    await expect(service.create(request({ dueDate: "2026-09-01" }))).resolves.toBeDefined();
  });

  it("rechaza cantidades <= 0 y listas vacías", async () => {
    const bad = request({ items: [{ description: "A", quantity: 0, unitPriceCents: 1 }] });
    await expect(service.create(bad)).rejects.toBeInstanceOf(ValidationError);
    await expect(service.create(request({ items: [] }))).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("InvoiceService lectura/modificación", () => {
  it("getById y NotFound", async () => {
    const { id } = await service.create(request());
    expect((await service.getById(id)).id).toBe(id);
    await expect(service.getById(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update reemplaza campos e items; 404 si no existe", async () => {
    const { id } = await service.create(request());
    const updated = await service.update(id, request({ clientName: "Otro", items: [{ description: "Z", quantity: 1, unitPriceCents: 500 }] }));
    expect(updated.clientName).toBe("Otro");
    expect(updated.items).toHaveLength(1);
    expect(updated.number).toBe("FAC-0001");
    await expect(service.update(999, request())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updateStatus solo cambia el estado", async () => {
    const created = await service.create(request());
    const { id, totalCents } = created;
    const r = await service.updateStatus(id, "PAID");
    expect(r.status).toBe("PAID");
    expect(r.totalCents).toBe(totalCents);
    expect(r.items).toHaveLength(2);
    expect(r.items.map((i) => i.id)).toEqual(created.items.map((i) => i.id));
    await expect(service.updateStatus(999, "PAID")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete y NotFound", async () => {
    const { id } = await service.create(request());
    await service.delete(id);
    await expect(service.delete(id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("isOverdue: SENT con vencimiento pasado", async () => {
    const sent = await service.create(request({ status: "SENT" }));
    const paid = await service.create(request({ status: "PAID" }));
    expect(sent.isOverdue).toBe(true);
    expect(paid.isOverdue).toBe(false);
  });

  it("list filtra, busca y pagina con meta", async () => {
    for (let i = 0; i < 5; i++) await service.create(request({ clientName: i < 2 ? "Beta SA" : "Acme", status: i === 0 ? "SENT" : "DRAFT" }));
    const page = await service.list({ page: 2, pageSize: 2 });
    expect(page.data).toHaveLength(2);
    expect(page.meta).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
    expect((await service.list({ page: 1, pageSize: 10, status: "SENT" })).meta.total).toBe(1);
    expect((await service.list({ page: 1, pageSize: 10, search: "beta" })).meta.total).toBe(2);
    expect((await service.list({ page: 1, pageSize: 10, search: "FAC-0003" })).meta.total).toBe(1);
  });
});

describe("repositorio falso", () => {
  it("sampleData es utilizable", async () => {
    const created = await repo.create({ ...sampleData(), number: "X" });
    expect(created.items).toHaveLength(1);
  });
});

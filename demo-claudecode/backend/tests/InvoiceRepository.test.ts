import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "../src/lib/prisma";
import { PrismaInvoiceRepository } from "../src/repositories";
import type { InvoiceData } from "../src/types";

const url = process.env.TEST_DATABASE_URL;
if (!url || url.includes("prisma/dev.db")) throw new Error("Tests need a temporary DB");

const db = createPrismaClient(url);
const repo = new PrismaInvoiceRepository(db);

const build = (over: Partial<InvoiceData> = {}): InvoiceData => ({
  clientName: "Cliente Prueba",
  issueDate: new Date("2026-09-01"),
  dueDate: new Date("2026-10-01"),
  status: "DRAFT",
  taxRate: 16,
  items: [{ description: "Servicio", quantity: 2, unitPriceCents: 10000 }],
  ...over,
});

let seq = 0;
const make = (over: Partial<InvoiceData> = {}) =>
  repo.create({ ...build(over), number: `T-${++seq}` });

beforeEach(async () => {
  await db.invoice.deleteMany();
});
afterAll(() => db.$disconnect());

describe("PrismaInvoiceRepository", () => {
  it("creates and finds by id with items and nullable fields", async () => {
    const created = await make({ items: [
      { description: "A", quantity: 1.5, unitPriceCents: 999 },
      { description: "B", quantity: 1, unitPriceCents: 1 },
    ] });
    const found = await repo.findById(created.id);
    expect(found?.clientEmail).toBeNull();
    expect(found?.items.map((i) => i.description)).toEqual(["A", "B"]);
    expect(found?.items[0].quantity).toBe(1.5);
    expect(await repo.findById(created.id + 999)).toBeNull();
  });

  it("rejects duplicate numbers", async () => {
    await repo.create({ ...build(), number: "DUP" });
    await expect(repo.create({ ...build(), number: "DUP" })).rejects.toThrow();
  });

  it("createWithNumber assigns the number built from the id", async () => {
    const inv = await repo.createWithNumber(build(), (id) => `FAC-${String(id).padStart(4, "0")}`);
    expect(inv.number).toBe(`FAC-${String(inv.id).padStart(4, "0")}`);
    expect((await repo.findById(inv.id))?.number).toBe(inv.number);
  });

  it("createWithNumber rolls back when the number builder fails", async () => {
    await expect(
      repo.createWithNumber(build(), () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect((await repo.findAll()).total).toBe(0);
  });

  it("filters by status", async () => {
    await make({ status: "PAID" });
    await make({ status: "SENT" });
    await make({ status: "SENT" });
    const res = await repo.findAll({ filters: { status: "SENT" } });
    expect(res.total).toBe(2);
    expect(res.data.every((i) => i.status === "SENT")).toBe(true);
  });

  it("searches by client name or number", async () => {
    await repo.create({ ...build({ clientName: "Abarrotes La Esperanza" }), number: "FAC-0007" });
    await make({ clientName: "Otro" });
    expect((await repo.findAll({ filters: { search: "esperanza" } })).total).toBe(1);
    expect((await repo.findAll({ filters: { search: "0007" } })).data[0].clientName).toBe(
      "Abarrotes La Esperanza",
    );
    expect((await repo.findAll({ filters: { search: "zzz" } })).total).toBe(0);
  });

  it("paginates and reports the unpaginated total, newest issueDate first", async () => {
    for (let d = 1; d <= 5; d++) await make({ issueDate: new Date(`2026-09-0${d}`) });
    const p1 = await repo.findAll({ pagination: { page: 1, pageSize: 2 } });
    const p3 = await repo.findAll({ pagination: { page: 3, pageSize: 2 } });
    expect(p1.total).toBe(5);
    expect(p1.data).toHaveLength(2);
    expect(p1.data[0].issueDate.toISOString()).toContain("2026-09-05");
    expect(p3.data).toHaveLength(1);
  });

  it("update replaces fields and items", async () => {
    const created = await make();
    const updated = await repo.update(
      created.id,
      build({
        clientName: "Nuevo",
        status: "PAID",
        items: [{ description: "Solo uno", quantity: 3, unitPriceCents: 500 }],
      }),
    );
    expect(updated?.clientName).toBe("Nuevo");
    expect(updated?.number).toBe(created.number);
    expect(updated?.items).toHaveLength(1);
    expect(await db.invoiceItem.count()).toBe(1);
  });

  it("update returns null for a missing invoice", async () => {
    expect(await repo.update(123456, build())).toBeNull();
  });

  it("delete removes the invoice and cascades to items", async () => {
    const created = await make();
    expect(await repo.delete(created.id)).toBe(true);
    expect(await repo.delete(created.id)).toBe(false);
    expect(await repo.findById(created.id)).toBeNull();
    expect(await db.invoiceItem.count()).toBe(0);
  });
});

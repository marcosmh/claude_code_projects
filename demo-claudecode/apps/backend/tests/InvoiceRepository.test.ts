import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "../src/lib/prisma";
import { PrismaInvoiceRepository } from "../src/repositories";
import { errorResponse } from "../src/utils/http";
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
  currency: "USD",
  items: [{ description: "Servicio", quantity: 2, unitPriceCents: 10000 }],
  ...over,
});

let U: number;
let OTHER: number;
let seq = 0;
const make = (over: Partial<InvoiceData> = {}) =>
  repo.create(U, { ...build(over), number: `T-${++seq}` });

beforeEach(async () => {
  await db.invoice.deleteMany();
  await db.user.deleteMany();
  U = (await db.user.create({ data: { email: "a@example.com", passwordHash: "x" } })).id;
  OTHER = (await db.user.create({ data: { email: "b@example.com", passwordHash: "x" } })).id;
});
afterAll(() => db.$disconnect());

describe("PrismaInvoiceRepository", () => {
  it("creates and finds by id with items and nullable fields", async () => {
    const created = await make({ items: [
      { description: "A", quantity: 1.5, unitPriceCents: 999 },
      { description: "B", quantity: 1, unitPriceCents: 1 },
    ] });
    const found = await repo.findById(U, created.id);
    expect(found?.clientEmail).toBeNull();
    expect(found?.items.map((i) => i.description)).toEqual(["A", "B"]);
    expect(found?.items[0].quantity).toBe(1.5);
    expect(await repo.findById(U, created.id + 999)).toBeNull();
  });

  it("rejects duplicate numbers", async () => {
    await repo.create(U, { ...build(), number: "DUP" });
    await expect(repo.create(U, { ...build(), number: "DUP" })).rejects.toThrow();
  });

  it("createWithNumber assigns the number built from the id", async () => {
    const inv = await repo.createWithNumber(U, build(), (id) => `FAC-${String(id).padStart(4, "0")}`);
    expect(inv.number).toBe(`FAC-${String(inv.id).padStart(4, "0")}`);
    expect((await repo.findById(U, inv.id))?.number).toBe(inv.number);
  });

  it("createWithNumber rolls back when the number builder fails", async () => {
    await expect(
      repo.createWithNumber(U, build(), () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect((await repo.findAll(U)).total).toBe(0);
  });

  it("filters by status", async () => {
    await make({ status: "PAID" });
    await make({ status: "SENT" });
    await make({ status: "SENT" });
    const res = await repo.findAll(U, { filters: { status: "SENT" } });
    expect(res.total).toBe(2);
    expect(res.data.every((i) => i.status === "SENT")).toBe(true);
  });

  it("searches by client name or number", async () => {
    await repo.create(U, { ...build({ clientName: "Abarrotes La Esperanza" }), number: "FAC-0007" });
    await make({ clientName: "Otro" });
    expect((await repo.findAll(U, { filters: { search: "esperanza" } })).total).toBe(1);
    expect((await repo.findAll(U, { filters: { search: "0007" } })).data[0].clientName).toBe(
      "Abarrotes La Esperanza",
    );
    expect((await repo.findAll(U, { filters: { search: "zzz" } })).total).toBe(0);
  });

  it("paginates and reports the unpaginated total, newest issueDate first", async () => {
    for (let d = 1; d <= 5; d++) await make({ issueDate: new Date(`2026-09-0${d}`) });
    const p1 = await repo.findAll(U, { pagination: { page: 1, pageSize: 2 } });
    const p3 = await repo.findAll(U, { pagination: { page: 3, pageSize: 2 } });
    expect(p1.total).toBe(5);
    expect(p1.data).toHaveLength(2);
    expect(p1.data[0].issueDate.toISOString()).toContain("2026-09-05");
    expect(p3.data).toHaveLength(1);
  });

  it("update replaces fields and items", async () => {
    const created = await make();
    const updated = await repo.update(U, 
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
    expect(await repo.update(U, 123456, build())).toBeNull();
  });

  it("findStatsRows returns a minimal projection and honours issuedFrom", async () => {
    await make({ issueDate: new Date("2026-05-10"), clientName: "Vieja" });
    await make({ issueDate: new Date("2026-09-10"), clientName: "Nueva", notes: "secreto" });
    const all = await repo.findStatsRows(U);
    expect(all).toHaveLength(2);
    expect(Object.keys(all[0]).sort()).toEqual(["dueDate", "issueDate", "items", "status", "taxRate"]);
    expect(Object.keys(all[0].items[0]).sort()).toEqual(["quantity", "unitPriceCents"]);
    const recent = await repo.findStatsRows(U, { issuedFrom: new Date("2026-09-01") });
    expect(recent).toHaveLength(1);
    expect(recent[0].issueDate).toEqual(new Date("2026-09-10"));
  });

  it("findStatsRows filters by currency", async () => {
    await make({ currency: "USD" });
    await make({ currency: "MXN" });
    expect(await repo.findStatsRows(U)).toHaveLength(2);
    expect(await repo.findStatsRows(U, { currency: "MXN" })).toHaveLength(1);
    expect(await repo.findStatsRows(U, { currency: "EUR" })).toHaveLength(0);
  });

  it("updateStatus changes only the status: item ids are stable and updatedAt moves", async () => {
    const created = await make({ items: [
      { description: "A", quantity: 1, unitPriceCents: 100 },
      { description: "B", quantity: 2, unitPriceCents: 200 },
    ] });
    await new Promise((r) => setTimeout(r, 15));
    const updated = await repo.updateStatus(U, created.id, "PAID");
    expect(updated?.status).toBe("PAID");
    expect(updated?.items.map((i) => i.id)).toEqual(created.items.map((i) => i.id));
    expect(updated?.clientName).toBe(created.clientName);
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
  });

  it("updateStatus returns null for a missing invoice", async () => {
    expect(await repo.updateStatus(U, 123456, "PAID")).toBeNull();
  });

  it("a real duplicate-number error becomes a 409, not a 500", async () => {
    await repo.create(U, { ...build(), number: "DUP-409" });
    const error = await repo.create(U, { ...build(), number: "DUP-409" }).catch((e) => e);
    const res = errorResponse(error);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("CONFLICT");
  });

  it("an invoice of another owner behaves as if it did not exist, in every operation", async () => {
    const mine = await make({ clientName: "Mía", status: "SENT" });
    const theirs = await repo.create(OTHER, { ...build({ clientName: "Ajena" }), number: "T-other" });

    expect(await repo.findById(U, theirs.id)).toBeNull();
    expect(await repo.update(U, theirs.id, build({ clientName: "Hackeada" }))).toBeNull();
    expect(await repo.updateStatus(U, theirs.id, "PAID")).toBeNull();
    expect(await repo.delete(U, theirs.id)).toBe(false);

    const untouched = await repo.findById(OTHER, theirs.id);
    expect(untouched).toMatchObject({ clientName: "Ajena", status: "DRAFT" });
    expect(await db.invoiceItem.count({ where: { invoiceId: theirs.id } })).toBe(1);

    expect((await repo.findAll(U)).data.map((i) => i.id)).toEqual([mine.id]);
    expect((await repo.findAll(U, { filters: { search: "Ajena" } })).total).toBe(0);
    expect((await repo.findAll(OTHER)).data.map((i) => i.id)).toEqual([theirs.id]);
    expect(await repo.findStatsRows(U)).toHaveLength(1);
    expect(await repo.findStatsRows(OTHER)).toHaveLength(1);
  });

  it("createWithNumber and create store the owner", async () => {
    const a = await repo.createWithNumber(OTHER, build(), (id) => `FAC-${id}`);
    const b = await repo.create(OTHER, { ...build(), number: "T-owner" });
    const rows = await db.invoice.findMany({ where: { id: { in: [a.id, b.id] } }, select: { ownerId: true } });
    expect(rows.map((r) => r.ownerId)).toEqual([OTHER, OTHER]);
  });

  it("delete removes the invoice and cascades to items", async () => {
    const created = await make();
    expect(await repo.delete(U, created.id)).toBe(true);
    expect(await repo.delete(U, created.id)).toBe(false);
    expect(await repo.findById(U, created.id)).toBeNull();
    expect(await db.invoiceItem.count()).toBe(0);
  });
});

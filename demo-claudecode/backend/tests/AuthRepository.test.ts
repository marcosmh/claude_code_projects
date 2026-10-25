import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "../src/lib/prisma";
import { PrismaAuthRepository, PrismaInvoiceRepository } from "../src/repositories";

const url = process.env.TEST_DATABASE_URL;
if (!url || url.includes("prisma/dev.db")) throw new Error("Tests need a temporary DB");

const db = createPrismaClient(url);
const repo = new PrismaAuthRepository(db);
const invoices = new PrismaInvoiceRepository(db);

const invoice = {
  clientName: "Cliente",
  issueDate: new Date("2026-09-01"),
  dueDate: new Date("2026-10-01"),
  status: "DRAFT" as const,
  taxRate: 0,
  items: [{ description: "A", quantity: 1, unitPriceCents: 100 }],
};

beforeEach(async () => {
  await db.invoice.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
});
afterAll(() => db.$disconnect());

describe("PrismaAuthRepository", () => {
  it("creates users, finds them by email and counts them; emails are unique", async () => {
    expect(await repo.countUsers()).toBe(0);
    const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
    expect(await repo.findUserByEmail("ana@example.com")).toEqual(user);
    expect(await repo.findUserByEmail("otra@example.com")).toBeNull();
    expect(await repo.countUsers()).toBe(1);
    await expect(repo.createUser({ email: "ana@example.com", passwordHash: "h" })).rejects.toThrow();
  });

  it("stores sessions by token hash and returns the user without the password hash", async () => {
    const user = await repo.createUser({ email: "ana@example.com", passwordHash: "secret-hash" });
    const expiresAt = new Date("2026-12-01T00:00:00Z");
    await repo.createSession({ tokenHash: "abc", userId: user.id, expiresAt });
    const found = await repo.findSession("abc");
    expect(found).toEqual({ user: { id: user.id, email: "ana@example.com" }, expiresAt });
    expect(JSON.stringify(found)).not.toContain("secret-hash");
    expect(await repo.findSession("missing")).toBeNull();
    await repo.deleteSession("abc");
    expect(await repo.findSession("abc")).toBeNull();
  });

  it("deleteExpiredSessions removes only the expired ones", async () => {
    const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
    await repo.createSession({ tokenHash: "old", userId: user.id, expiresAt: new Date("2026-01-01") });
    await repo.createSession({ tokenHash: "new", userId: user.id, expiresAt: new Date("2027-01-01") });
    expect(await repo.deleteExpiredSessions(new Date("2026-10-10"))).toBe(1);
    expect(await repo.findSession("old")).toBeNull();
    expect(await repo.findSession("new")).not.toBeNull();
  });

  it("deleting a user removes their sessions but keeps their invoices, unowned", async () => {
    const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
    await repo.createSession({ tokenHash: "s", userId: user.id, expiresAt: new Date("2027-01-01") });
    const created = await invoices.createWithNumber(user.id, invoice, (id) => `FAC-${id}`);
    await db.user.delete({ where: { id: user.id } });
    expect(await db.session.count()).toBe(0);
    expect((await db.invoice.findUnique({ where: { id: created.id } }))?.ownerId).toBeNull();
  });

  it("claimOrphanInvoices assigns only unowned invoices", async () => {
    const ana = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
    const bea = await repo.createUser({ email: "bea@example.com", passwordHash: "h" });
    const owned = await invoices.createWithNumber(bea.id, invoice, (id) => `FAC-${id}`);
    await db.invoice.create({ data: { ...invoice, number: "legacy-1", items: { create: invoice.items } } });
    await db.invoice.create({ data: { ...invoice, number: "legacy-2", items: { create: invoice.items } } });

    expect(await repo.claimOrphanInvoices(ana.id)).toBe(2);
    expect(await repo.claimOrphanInvoices(ana.id)).toBe(0);
    expect((await invoices.findAll(ana.id)).total).toBe(2);
    expect((await invoices.findById(bea.id, owned.id))?.id).toBe(owned.id);
  });
});

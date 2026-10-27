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
  await db.refreshToken.deleteMany();
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

  it("updatePasswordHash only writes when the stored hash is the expected one and touches nothing else", async () => {
    const user = await repo.createUser({ email: "ana@example.com", passwordHash: "old" });
    await repo.incrementTokenVersion(user.id);
    expect(await repo.updatePasswordHash(user.id, "new", "stale")).toBe(false);
    expect((await repo.findUserById(user.id))?.passwordHash).toBe("old");
    expect(await repo.updatePasswordHash(user.id, "new", "old")).toBe(true);
    const after = await repo.findUserById(user.id);
    expect(after?.passwordHash).toBe("new");
    expect(after?.tokenVersion).toBe(1);
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

  it("registerFailedLogin cuenta, bloquea al llegar al máximo y reinicia el contador", async () => {
    const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
    const until = new Date("2026-12-01T00:00:00Z");
    for (let i = 0; i < 2; i++) await repo.registerFailedLogin(user.id, 3, until);
    expect(await db.user.findUnique({ where: { id: user.id }, select: { failedLogins: true, lockedUntil: true } })).toEqual({
      failedLogins: 2,
      lockedUntil: null,
    });
    await repo.registerFailedLogin(user.id, 3, until);
    expect(await db.user.findUnique({ where: { id: user.id }, select: { failedLogins: true, lockedUntil: true } })).toEqual({
      failedLogins: 0,
      lockedUntil: until,
    });
    expect((await repo.findUserById(user.id))?.lockedUntil).toEqual(until);
  });

  it("los intentos concurrentes se cuentan todos", async () => {
    const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
    await Promise.all(Array.from({ length: 4 }, () => repo.registerFailedLogin(user.id, 100, new Date())));
    expect((await db.user.findUnique({ where: { id: user.id } }))?.failedLogins).toBe(4);
  });

  describe("reserva atómica de intentos de login", () => {
    const until = new Date("2026-12-01T00:00:00Z");
    const now = new Date("2026-10-10T12:00:00Z");
    const state = (id: number) => db.user.findUnique({ where: { id }, select: { failedLogins: true, lockedUntil: true } });

    it("reserveLoginAttempt cuenta cada reserva y bloquea al superar el máximo", async () => {
      const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
      for (let i = 0; i < 3; i++) expect(await repo.reserveLoginAttempt(user.id, 3, until, now)).toBe(true);
      expect(await state(user.id)).toEqual({ failedLogins: 3, lockedUntil: null });
      expect(await repo.reserveLoginAttempt(user.id, 3, until, now)).toBe(false);
      expect(await state(user.id)).toEqual({ failedLogins: 0, lockedUntil: until });
    });

    it("rechaza sin contar ni alargar el bloqueo mientras dura, y lo libera al caducar", async () => {
      const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
      await db.user.update({ where: { id: user.id }, data: { lockedUntil: until } });
      expect(await repo.reserveLoginAttempt(user.id, 3, new Date("2027-01-01"), now)).toBe(false);
      expect(await state(user.id)).toEqual({ failedLogins: 0, lockedUntil: until });
      expect(await repo.reserveLoginAttempt(user.id, 3, until, new Date(until.getTime() + 1))).toBe(true);
      expect(await state(user.id)).toEqual({ failedLogins: 1, lockedUntil: null });
      expect(await repo.reserveLoginAttempt(user.id + 999, 3, until, now)).toBe(false);
    });

    it("reservas concurrentes: como mucho `max` pasan y el resto bloquea la cuenta", async () => {
      const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
      const results = await Promise.all(Array.from({ length: 12 }, () => repo.reserveLoginAttempt(user.id, 5, until, now)));
      expect(results.filter(Boolean)).toHaveLength(5);
      expect((await state(user.id))?.lockedUntil).toEqual(until);
    });

    it("settleFailedLogin bloquea solo si el contador llegó al máximo y no cuenta otra vez", async () => {
      const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
      for (let i = 0; i < 2; i++) await repo.reserveLoginAttempt(user.id, 3, until, now);
      await repo.settleFailedLogin(user.id, 3, until);
      expect(await state(user.id)).toEqual({ failedLogins: 2, lockedUntil: null });
      await repo.reserveLoginAttempt(user.id, 3, until, now);
      await repo.settleFailedLogin(user.id, 3, until);
      expect(await state(user.id)).toEqual({ failedLogins: 0, lockedUntil: until });
    });

    it("completeLogin limpia contador y bloqueo caducado, pero falla si la cuenta está bloqueada", async () => {
      const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
      await repo.reserveLoginAttempt(user.id, 3, until, now);
      expect(await repo.completeLogin(user.id, now)).toBe(true);
      expect(await state(user.id)).toEqual({ failedLogins: 0, lockedUntil: null });
      await db.user.update({ where: { id: user.id }, data: { failedLogins: 2, lockedUntil: until } });
      expect(await repo.completeLogin(user.id, now)).toBe(false);
      expect(await state(user.id)).toEqual({ failedLogins: 2, lockedUntil: until });
      expect(await repo.completeLogin(user.id, new Date(until.getTime() + 1))).toBe(true);
      expect(await repo.completeLogin(user.id + 999, now)).toBe(false);
    });
  });

  it("clearLoginFailures y updatePassword quitan fallos y bloqueo", async () => {
    const user = await repo.createUser({ email: "ana@example.com", passwordHash: "old" });
    await repo.registerFailedLogin(user.id, 1, new Date("2099-01-01"));
    await repo.clearLoginFailures(user.id);
    expect((await repo.findUserById(user.id))?.lockedUntil).toBeNull();

    await repo.registerFailedLogin(user.id, 1, new Date("2099-01-01"));
    await repo.updatePassword(user.id, "new");
    expect(await repo.findUserById(user.id)).toMatchObject({ passwordHash: "new", lockedUntil: null });
    expect(await repo.findUserById(user.id + 999)).toBeNull();
  });

  it("deleteOtherSessions conserva solo la indicada y solo de ese usuario", async () => {
    const ana = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
    const bea = await repo.createUser({ email: "bea@example.com", passwordHash: "h" });
    const expiresAt = new Date("2027-01-01");
    for (const [tokenHash, userId] of [["a1", ana.id], ["a2", ana.id], ["a3", ana.id], ["b1", bea.id]] as const) {
      await repo.createSession({ tokenHash, userId, expiresAt });
    }
    expect(await repo.deleteOtherSessions(ana.id, "a2")).toBe(2);
    expect(await repo.findSession("a2")).not.toBeNull();
    expect(await repo.findSession("a1")).toBeNull();
    expect(await repo.findSession("b1")).not.toBeNull();
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

  describe("refresh tokens", () => {
    const expiresAt = new Date("2027-01-01T00:00:00Z");
    const now = new Date("2026-10-26T12:00:00Z");
    const newUser = (email = "ana@example.com") => repo.createUser({ email, passwordHash: "h" });

    it("creates and finds tokens by hash, unrevoked at first", async () => {
      const user = await newUser();
      const created = await repo.createRefreshToken({ tokenHash: "h1", family: "f1", userId: user.id, expiresAt });
      expect(created).toMatchObject({ tokenHash: "h1", family: "f1", userId: user.id, revokedAt: null, replacedBy: null });
      expect(await repo.findRefreshToken("h1")).toEqual(created);
      expect(await repo.findRefreshToken("nope")).toBeNull();
      await expect(
        repo.createRefreshToken({ tokenHash: "h1", family: "f2", userId: user.id, expiresAt }),
      ).rejects.toThrow();
    });

    it("rotation revokes the old token, links replacedBy and creates the new one", async () => {
      const user = await newUser();
      const first = await repo.createRefreshToken({ tokenHash: "h1", family: "f1", userId: user.id, expiresAt });
      const second = await repo.rotateRefreshToken(
        "h1",
        { tokenHash: "h2", family: "f1", userId: user.id, expiresAt },
        now,
      );
      expect(second).toMatchObject({ tokenHash: "h2", family: "f1", revokedAt: null });
      expect(await repo.findRefreshToken("h1")).toMatchObject({ id: first.id, revokedAt: now, replacedBy: second!.id });
      expect(await repo.findRefreshToken("h2")).toMatchObject({ revokedAt: null });
    });

    it("rotating an already-rotated or unknown token returns null and creates nothing", async () => {
      const user = await newUser();
      await repo.createRefreshToken({ tokenHash: "h1", family: "f1", userId: user.id, expiresAt });
      await repo.rotateRefreshToken("h1", { tokenHash: "h2", family: "f1", userId: user.id, expiresAt }, now);
      const reuse = await repo.rotateRefreshToken(
        "h1",
        { tokenHash: "h3", family: "f1", userId: user.id, expiresAt },
        now,
      );
      expect(reuse).toBeNull();
      expect(await repo.findRefreshToken("h3")).toBeNull();
      expect(await repo.rotateRefreshToken("ghost", { tokenHash: "h4", family: "f1", userId: user.id, expiresAt }, now)).toBeNull();
      expect(await repo.findRefreshToken("h4")).toBeNull();
    });

    it("concurrent rotations of the same token: exactly one wins", async () => {
      const user = await newUser();
      await repo.createRefreshToken({ tokenHash: "h1", family: "f1", userId: user.id, expiresAt });
      const results = await Promise.all(
        ["a", "b"].map((h) =>
          repo.rotateRefreshToken("h1", { tokenHash: `n-${h}`, family: "f1", userId: user.id, expiresAt }, now),
        ),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
    });

    it("revokeOtherRefreshTokens keeps the given family and other users untouched", async () => {
      const ana = await newUser();
      const bea = await newUser("bea@example.com");
      await repo.createRefreshToken({ tokenHash: "a1", family: "fa", userId: ana.id, expiresAt });
      await repo.createRefreshToken({ tokenHash: "a2", family: "fb", userId: ana.id, expiresAt });
      await repo.createRefreshToken({ tokenHash: "b1", family: "fc", userId: bea.id, expiresAt });
      expect(await repo.revokeOtherRefreshTokens(ana.id, "fa", now)).toBe(1);
      expect((await repo.findRefreshToken("a1"))!.revokedAt).toBeNull();
      expect((await repo.findRefreshToken("a2"))!.revokedAt).toEqual(now);
      expect((await repo.findRefreshToken("b1"))!.revokedAt).toBeNull();
    });

    it("revokes a whole family without touching other families", async () => {
      const user = await newUser();
      await repo.createRefreshToken({ tokenHash: "h1", family: "f1", userId: user.id, expiresAt });
      await repo.rotateRefreshToken("h1", { tokenHash: "h2", family: "f1", userId: user.id, expiresAt }, now);
      await repo.createRefreshToken({ tokenHash: "o1", family: "f2", userId: user.id, expiresAt });
      const later = new Date("2026-10-26T13:00:00Z");
      // h1 was already revoked by rotation (count excludes it and keeps its original date)
      expect(await repo.revokeRefreshTokenFamily("f1", later)).toBe(1);
      expect((await repo.findRefreshToken("h1"))!.revokedAt).toEqual(now);
      expect((await repo.findRefreshToken("h2"))!.revokedAt).toEqual(later);
      expect((await repo.findRefreshToken("o1"))!.revokedAt).toBeNull();
      expect(await repo.revokeRefreshTokenFamily("f1", later)).toBe(0);
    });

    it("revokes all tokens of one user only", async () => {
      const ana = await newUser();
      const luis = await newUser("luis@example.com");
      await repo.createRefreshToken({ tokenHash: "a1", family: "fa", userId: ana.id, expiresAt });
      await repo.createRefreshToken({ tokenHash: "a2", family: "fb", userId: ana.id, expiresAt });
      await repo.createRefreshToken({ tokenHash: "l1", family: "fc", userId: luis.id, expiresAt });
      expect(await repo.revokeAllRefreshTokens(ana.id, now)).toBe(2);
      expect((await repo.findRefreshToken("a1"))!.revokedAt).toEqual(now);
      expect((await repo.findRefreshToken("l1"))!.revokedAt).toBeNull();
    });

    it("deleteExpiredRefreshTokens removes only expired ones; deleting a user cascades", async () => {
      const user = await newUser();
      await repo.createRefreshToken({ tokenHash: "old", family: "f", userId: user.id, expiresAt: new Date("2026-01-01") });
      await repo.createRefreshToken({ tokenHash: "new", family: "f", userId: user.id, expiresAt });
      expect(await repo.deleteExpiredRefreshTokens(now)).toBe(1);
      expect(await repo.findRefreshToken("old")).toBeNull();
      await db.user.delete({ where: { id: user.id } });
      expect(await repo.findRefreshToken("new")).toBeNull();
    });
  });

  describe("tokenVersion and role", () => {
    it("starts at 0, increments atomically and returns null for unknown users", async () => {
      const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
      expect(await repo.getTokenVersion(user.id)).toBe(0);
      expect(await repo.incrementTokenVersion(user.id)).toBe(1);
      const both = await Promise.all([repo.incrementTokenVersion(user.id), repo.incrementTokenVersion(user.id)]);
      expect([...both].sort()).toEqual([2, 3]);
      expect(await repo.getTokenVersion(user.id)).toBe(3);
      expect(await repo.getTokenVersion(9999)).toBeNull();
      expect(await repo.incrementTokenVersion(9999)).toBeNull();
    });

    it("createUser stores the role; records and the lean identity carry role and version, never the hash", async () => {
      const admin = await repo.createUser({ email: "root@example.com", passwordHash: "h", role: "ADMIN" });
      expect(admin).toMatchObject({ role: "ADMIN", tokenVersion: 0, lockedUntil: null });
      const identity = await repo.findAuthIdentity(admin.id);
      expect(identity).toEqual({ id: admin.id, email: "root@example.com", role: "ADMIN", tokenVersion: 0, lockedUntil: null });
      expect(identity).not.toHaveProperty("passwordHash");
      expect(await repo.findAuthIdentity(9999)).toBeNull();
      expect((await repo.findUserById(admin.id))?.role).toBe("ADMIN");
      expect((await repo.findUserByEmail("root@example.com"))?.role).toBe("ADMIN");
    });

    it("defaults the role to USER and reads a stored ADMIN", async () => {
      const user = await repo.createUser({ email: "ana@example.com", passwordHash: "h" });
      expect(await repo.getUserRole(user.id)).toBe("USER");
      await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      expect(await repo.getUserRole(user.id)).toBe("ADMIN");
      expect(await repo.getUserRole(9999)).toBeNull();
    });
  });
});

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "../src/lib/prisma";
import { PrismaAuditRepository } from "../src/repositories";

const url = process.env.TEST_DATABASE_URL;
if (!url || !/[?&]schema=test_/.test(url)) throw new Error("Tests need a temporary schema (?schema=test_...)");

const db = createPrismaClient(url);
const repo = new PrismaAuditRepository(db);

beforeEach(() => db.auditEvent.deleteMany());
afterAll(() => db.$disconnect());

describe("PrismaAuditRepository", () => {
  it("guarda eventos con y sin usuario ni motivo, y los devuelve del más nuevo al más antiguo", async () => {
    await repo.record({ action: "login_failed", reason: "unknown_account" });
    await repo.record({ action: "login_success", userId: 5 });
    await repo.record({ action: "refresh_reuse_detected", userId: 5, reason: "concurrent_rotation" });
    const all = await repo.findRecent({}, 10);
    expect(all.map((e) => e.action)).toEqual(["refresh_reuse_detected", "login_success", "login_failed"]);
    expect(all[0]).toEqual({ id: expect.any(Number), action: "refresh_reuse_detected", userId: 5, reason: "concurrent_rotation", createdAt: expect.any(Date) });
    expect(all[2]).toEqual({ id: expect.any(Number), action: "login_failed", reason: "unknown_account", createdAt: expect.any(Date) });
  });

  it("filtra por acción y por usuario y respeta el límite", async () => {
    for (let i = 0; i < 3; i++) await repo.record({ action: "login_failed", userId: 1 });
    await repo.record({ action: "login_failed", userId: 2 });
    await repo.record({ action: "logout", userId: 1 });
    expect(await repo.findRecent({ action: "login_failed" }, 10)).toHaveLength(4);
    expect(await repo.findRecent({ userId: 1 }, 10)).toHaveLength(4);
    expect(await repo.findRecent({ action: "login_failed", userId: 1 }, 2)).toHaveLength(2);
  });

  it("la traza sobrevive aunque el usuario no exista (sin clave foránea)", async () => {
    await repo.record({ action: "login_failed", userId: 999_999 });
    expect(await repo.findRecent({ userId: 999_999 }, 1)).toHaveLength(1);
  });
});

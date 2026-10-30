import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuditEventInput, AuditRepository } from "../src/repositories/AuditRepository";
import { combineAudit, persistentAudit } from "../src/utils/audit";

afterEach(() => vi.restoreAllMocks());

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeRepo(fail = false) {
  const events: AuditEventInput[] = [];
  const repo: AuditRepository = {
    record: async (event) => {
      if (fail) throw new Error("db down: postgres://user:pw@host/db");
      events.push(event);
    },
    findRecent: async () => [],
  };
  return { repo, events };
}

describe("persistentAudit", () => {
  it("guarda acción, usuario y motivo", async () => {
    const { repo, events } = fakeRepo();
    persistentAudit(repo)("login_failed", { userId: 3, reason: "wrong_password" });
    await flush();
    expect(events).toEqual([{ action: "login_failed", userId: 3, reason: "wrong_password" }]);
  });

  it("no guarda refresh_success (una fila por cada renovación del access token)", async () => {
    const { repo, events } = fakeRepo();
    persistentAudit(repo)("refresh_success", { userId: 3 });
    persistentAudit(repo)("login_success", { userId: 3 });
    await flush();
    expect(events.map((e) => e.action)).toEqual(["login_success"]);
  });

  it("si la base falla no lanza, y lo que se registra no incluye el mensaje del error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { repo } = fakeRepo(true);
    expect(() => persistentAudit(repo)("logout", { userId: 1 })).not.toThrow();
    await flush();
    expect(error).toHaveBeenCalledTimes(1);
    const line = String(error.mock.calls[0][0]);
    expect(line).toContain("audit_persist_failed");
    expect(line).not.toContain("postgres://");
  });
});

describe("combineAudit", () => {
  it("llama a todos y uno que lanza no frena a los demás", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const seen: string[] = [];
    const audit = combineAudit(
      () => {
        throw new Error("boom");
      },
      (action) => void seen.push(action),
    );
    expect(() => audit("login_locked", { userId: 1 })).not.toThrow();
    expect(seen).toEqual(["login_locked"]);
    expect(String(error.mock.calls[0][0])).toContain("audit_logger_failed");
  });
});

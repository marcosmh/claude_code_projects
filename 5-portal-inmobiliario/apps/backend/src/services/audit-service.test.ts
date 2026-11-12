import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuditRecord } from "@/repositories/audit-repository";
import { createAuditService } from "./audit-service";

const record: AuditRecord = {
  id: "a1",
  createdAt: new Date("2026-11-12T10:00:00.000Z"),
  action: "USER_UPDATED",
  summary: "Actualizó la cuenta de Ana",
  actorId: "u1",
  actorEmail: "admin@portal.mx",
  entityType: "user",
  entityId: "u2",
  ipAddress: "10.0.0.1",
};

afterEach(() => vi.restoreAllMocks());

describe("createAuditService", () => {
  it("record guarda la entrada", async () => {
    const repository = { record: vi.fn().mockResolvedValue(undefined), findPage: vi.fn() };
    await createAuditService(repository).record({ action: "LOGOUT", summary: "Cerró sesión" });
    expect(repository.record).toHaveBeenCalledWith({ action: "LOGOUT", summary: "Cerró sesión" });
  });

  it("record nunca propaga un fallo del repositorio", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const repository = {
      record: vi.fn().mockRejectedValue(new Error("db caída")),
      findPage: vi.fn(),
    };

    await expect(
      createAuditService(repository).record({ action: "LOGOUT", summary: "Cerró sesión" }),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
  });

  it("listLogs pagina, convierte a DTO y deriva la categoría", async () => {
    const repository = {
      record: vi.fn(),
      findPage: vi.fn().mockResolvedValue({ records: [record], total: 41 }),
    };
    const page = await createAuditService(repository).listLogs({ page: 3, pageSize: 20 });

    expect(repository.findPage).toHaveBeenCalledWith({ skip: 40, take: 20 });
    expect(page).toMatchObject({ page: 3, pageSize: 20, total: 41, totalPages: 3 });
    expect(page.items[0]).toMatchObject({
      id: "a1",
      createdAt: "2026-11-12T10:00:00.000Z",
      action: "USER_UPDATED",
      category: "users",
    });
  });

  it("listLogs traduce categoría y fechas (la fecha final es inclusiva)", async () => {
    const repository = {
      record: vi.fn(),
      findPage: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    };
    await createAuditService(repository).listLogs({
      page: 1,
      pageSize: 20,
      category: "settings",
      search: "ana",
      from: "2026-11-01",
      to: "2026-11-12",
    });

    expect(repository.findPage).toHaveBeenCalledWith({
      skip: 0,
      take: 20,
      actions: ["SETTINGS_UPDATED"],
      searchText: "ana",
      createdFrom: new Date("2026-11-01T00:00:00.000Z"),
      createdBefore: new Date("2026-11-13T00:00:00.000Z"),
    });
  });
});

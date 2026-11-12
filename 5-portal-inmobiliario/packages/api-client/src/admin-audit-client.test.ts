import { afterEach, describe, expect, it, vi } from "vitest";
import { adminAuditUrl, buildAdminAuditUrl, fetchAdminAudit } from "./admin-audit-client";

afterEach(() => vi.unstubAllGlobals());

describe("buildAdminAuditUrl", () => {
  it("usa la página 1 por defecto y omite los filtros vacíos", () => {
    expect(buildAdminAuditUrl()).toBe(`${adminAuditUrl}?page=1`);
    expect(buildAdminAuditUrl({ search: "  ", from: "", to: "" })).toBe(`${adminAuditUrl}?page=1`);
  });

  it("incluye todos los filtros indicados", () => {
    const url = buildAdminAuditUrl({
      page: 2,
      pageSize: 50,
      search: " ana ",
      category: "users",
      from: "2026-11-01",
      to: "2026-11-12",
    });
    expect(new URL(url, "http://x").searchParams.toString()).toBe(
      "page=2&pageSize=50&search=ana&category=users&from=2026-11-01&to=2026-11-12",
    );
  });
});

describe("fetchAdminAudit", () => {
  it("devuelve la página recibida", async () => {
    const page = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(page)));
    await expect(fetchAdminAudit()).resolves.toEqual(page);
  });

  it("falla con el mensaje de la API y el estado", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ message: "Prohibido", status: 403 }, { status: 403 })),
    );
    await expect(fetchAdminAudit()).rejects.toMatchObject({ message: "Prohibido", status: 403 });
  });

  it("usa un mensaje genérico si el cuerpo no es JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x", { status: 500 })));
    await expect(fetchAdminAudit()).rejects.toMatchObject({ status: 500 });
  });
});

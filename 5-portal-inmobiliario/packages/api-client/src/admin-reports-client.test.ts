import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "./properties-client";
import { adminReportsUrl, fetchAdminReports } from "./admin-reports-client";

afterEach(() => vi.unstubAllGlobals());

describe("fetchAdminReports", () => {
  it("pide /api/admin/reports y devuelve el JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ generatedAt: "2026-11-12" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAdminReports()).resolves.toEqual({ generatedAt: "2026-11-12" });
    expect(fetchMock).toHaveBeenCalledWith(adminReportsUrl, {
      headers: { Accept: "application/json" },
    });
  });

  it("lanza ApiRequestError con el estado cuando la respuesta no es correcta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));

    await expect(fetchAdminReports()).rejects.toMatchObject({
      constructor: ApiRequestError,
      status: 403,
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { adminDashboardUrl, fetchAdminDashboard } from "./admin-client";
import { ApiRequestError } from "./properties-client";

afterEach(() => vi.unstubAllGlobals());

describe("fetchAdminDashboard", () => {
  it("devuelve los indicadores", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ users: 3 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchAdminDashboard()).toEqual({ users: 3 });
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(adminDashboardUrl);
  });

  it("lanza ApiRequestError con el estado de la API al fallar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    const error = await fetchAdminDashboard().catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 403 });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { statsService } from "./statsService";

afterEach(() => vi.unstubAllGlobals());

describe("statsService", () => {
  it("summary devuelve data", async () => {
    const summary = { totalCount: 0 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: summary })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(statsService.summary()).resolves.toEqual(summary);
    expect(new URL(fetchMock.mock.calls[0]?.[0] as string, "http://localhost").pathname.endsWith("/stats/summary")).toBe(true);
  });

  it("envía currency en la query de summary y monthly", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ data: [] }))));
    vi.stubGlobal("fetch", fetchMock);

    await statsService.summary("MXN");
    await statsService.monthly(6, "EUR");
    await statsService.summary();
    const params = fetchMock.mock.calls.map((c) => new URL(c[0] as string, "http://localhost").searchParams.get("currency"));
    expect(params).toEqual(["MXN", "EUR", null]);
  });

  it("monthly envía months en la query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ key: "2026-10" }] })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(statsService.monthly(6)).resolves.toEqual([{ key: "2026-10" }]);
    const url = new URL(fetchMock.mock.calls[0]?.[0] as string, "http://localhost");
    expect(url.pathname.endsWith("/stats/monthly")).toBe(true);
    expect(url.searchParams.get("months")).toBe("6");
  });

  it("propaga errores de red como ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    await expect(statsService.summary()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMonthlyStats, useStatsSummary } from "./useStats";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

afterEach(() => vi.unstubAllGlobals());

describe("useStats", () => {
  it("useStatsSummary carga el resumen", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { totalCount: 3 } }))));
    const { result } = renderHook(() => useStatsSummary(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ totalCount: 3 });
  });

  it("useMonthlyStats usa 6 meses por defecto y acepta otro valor", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ data: [] }))));
    vi.stubGlobal("fetch", fetchMock);

    const a = renderHook(() => useMonthlyStats(), { wrapper });
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    const b = renderHook(() => useMonthlyStats(12), { wrapper });
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));

    const months = fetchMock.mock.calls.map((c) => new URL(c[0] as string).searchParams.get("months"));
    expect(months).toEqual(["6", "12"]);
  });

  it("expone el error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("net")));
    const { result } = renderHook(() => useStatsSummary(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

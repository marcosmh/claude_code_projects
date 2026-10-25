import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInvoice } from "./useInvoice";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })}>{children}</QueryClientProvider>
);

afterEach(() => vi.unstubAllGlobals());

const apiError = (status: number) =>
  new Response(JSON.stringify({ error: { code: "X", message: "fallo" } }), { status });

describe("useInvoice", () => {
  it("no consulta cuando el id es null", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInvoice(null), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("carga la factura por id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 5, number: "FAC-0005" } }))));

    const { result } = renderHook(() => useInvoice(5), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ number: "FAC-0005" });
  });

  it("no reintenta un 404", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(apiError(404)));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInvoice(5), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reintenta dos veces un 500 antes de fallar", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(apiError(500)));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInvoice(5), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reintenta los fallos de red", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("net"));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInvoice(5), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

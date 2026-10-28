import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInvoices } from "./useInvoices";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

afterEach(() => vi.unstubAllGlobals());

describe("useInvoices", () => {
  it("carga la página y expone items y meta", async () => {
    const meta = { page: 2, pageSize: 10, total: 11, totalPages: 2 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 1 }], meta })));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInvoices({ status: ["SENT"], search: "acme", page: 2, pageSize: 10 }), { wrapper });

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ items: [{ id: 1 }], meta });
    const url = new URL(fetchMock.mock.calls[0]?.[0] as string, "http://localhost");
    expect(url.searchParams.get("status")).toBe("SENT");
    expect(url.searchParams.get("search")).toBe("acme");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("expone el ApiError cuando el servidor falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Error interno" } }), { status: 500 })),
    );

    const { result } = renderHook(() => useInvoices({}), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "INTERNAL_ERROR", message: "Error interno" });
  });
});

// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePropertyList } from "./usePropertyList";

afterEach(() => vi.unstubAllGlobals());

const page = (title: string) => ({
  items: [{ id: title, title }],
  page: 1,
  pageSize: 12,
  total: 1,
  totalPages: 1,
});

function wrapper({ children }: { children: ReactNode }) {
  // Caché aislada por prueba.
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
  );
}

describe("usePropertyList", () => {
  it("conserva los resultados anteriores mientras cargan los de nuevos parámetros", async () => {
    let resolveSecond: (response: Response) => void = () => undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(page("A"))))
      .mockReturnValueOnce(new Promise<Response>((resolve) => (resolveSecond = resolve)));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook((params) => usePropertyList(params), {
      wrapper,
      initialProps: { sort: "newest" as const },
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.properties).toHaveLength(1));
    expect(result.current.isLoading).toBe(false);

    rerender({ sort: "price_asc" as never });
    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    // Sin skeleton: los resultados anteriores siguen visibles.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.properties[0]).toMatchObject({ title: "A" });

    await act(async () => resolveSecond(new Response(JSON.stringify(page("B")))));
    await waitFor(() => expect(result.current.properties[0]).toMatchObject({ title: "B" }));
    expect(result.current.isRefreshing).toBe(false);
  });

  it("reporta error cuando la API falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    const { result } = renderHook(() => usePropertyList({}), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
          {children}
        </SWRConfig>
      ),
    });
    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });
});

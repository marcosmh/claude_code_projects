// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

const fetchCurrentUserMock = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", () => ({
  currentUserUrl: "/api/auth/me",
  fetchCurrentUser: fetchCurrentUserMock,
}));

import { useCurrentUser } from "./useCurrentUser";

// Caché aislada por prueba: SWR comparte estado global entre renders.
const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

const ana = { id: "u1", email: "ana@example.com", name: "Ana", role: "USER" as const };

afterEach(() => {
  cleanup();
  fetchCurrentUserMock.mockReset();
});

describe("useCurrentUser", () => {
  it("empieza cargando y luego entrega el usuario de la sesión", async () => {
    fetchCurrentUserMock.mockResolvedValue(ana);
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeUndefined();

    await waitFor(() => expect(result.current.user).toEqual(ana));
    expect(result.current.isLoading).toBe(false);
  });

  it("entrega null sin sesión", async () => {
    fetchCurrentUserMock.mockResolvedValue(null);
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("deja de cargar si la consulta falla, para no bloquear el header", async () => {
    fetchCurrentUserMock.mockRejectedValue(new Error("sin red"));
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeUndefined();
  });

  it("setUser actualiza la sesión sin volver a consultar la API", async () => {
    fetchCurrentUserMock.mockResolvedValue(null);
    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    await waitFor(() => expect(result.current.user).toBeNull());

    await act(async () => {
      await result.current.setUser(ana);
    });

    await waitFor(() => expect(result.current.user).toEqual(ana));
    expect(fetchCurrentUserMock).toHaveBeenCalledOnce();
  });
});

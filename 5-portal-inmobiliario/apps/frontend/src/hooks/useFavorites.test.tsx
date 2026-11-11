// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ user: null as { id: string; role?: string } | null }));
vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => ({ user: session.user }) }));

const api = vi.hoisted(() => ({
  fetchFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));
vi.mock("@portal/api-client", () => ({ favoritesUrl: "/api/favorites", ...api }));

import { useFavorites } from "./useFavorites";

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

afterEach(() => {
  cleanup();
  session.user = null;
  Object.values(api).forEach((mock) => mock.mockReset());
});

describe("useFavorites", () => {
  it("sin sesión no consulta la API", () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.favorites).toBeUndefined();
    expect(api.fetchFavorites).not.toHaveBeenCalled();
  });

  it("con sesión carga las favoritas y sabe cuáles están guardadas", async () => {
    session.user = { id: "u1", role: "USER" };
    api.fetchFavorites.mockResolvedValue([{ id: "p1" }]);
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => expect(result.current.favorites).toEqual([{ id: "p1" }]));
    expect(result.current.isFavorite("p1")).toBe(true);
    expect(result.current.isFavorite("p2")).toBe(false);
  });

  it("guarda una propiedad nueva y vuelve a consultar la lista", async () => {
    session.user = { id: "u1", role: "USER" };
    api.fetchFavorites.mockResolvedValueOnce([]).mockResolvedValue([{ id: "p2" }]);
    api.addFavorite.mockResolvedValue({ id: "p2" });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.favorites).toEqual([]));

    await act(() => result.current.toggleFavorite("p2"));

    expect(api.addFavorite).toHaveBeenCalledWith("p2");
    expect(api.removeFavorite).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isFavorite("p2")).toBe(true));
  });

  it("quita una propiedad que ya era favorita", async () => {
    session.user = { id: "u1", role: "USER" };
    api.fetchFavorites.mockResolvedValueOnce([{ id: "p1" }]).mockResolvedValue([]);
    api.removeFavorite.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isFavorite("p1")).toBe(true));

    await act(() => result.current.toggleFavorite("p1"));

    expect(api.removeFavorite).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(result.current.isFavorite("p1")).toBe(false));
  });

  it("un ADMIN no consulta favoritos y se identifica como administrador", () => {
    session.user = { id: "a1", role: "ADMIN" };
    const { result } = renderHook(() => useFavorites(), { wrapper });
    expect(result.current.isAdmin).toBe(true);
    expect(api.fetchFavorites).not.toHaveBeenCalled();
  });
});

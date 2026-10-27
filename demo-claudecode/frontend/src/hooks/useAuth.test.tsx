import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/queryClient";
import { clearAccessToken, clearLoggedOutLocally, getAccessToken, isLoggedOutLocally, setAccessToken } from "@/services/tokenStorage";
import { useToastStore } from "@/store/toastStore";
import { queryKeys } from "./queryKeys";
import { useLogin, useLogout, useSession } from "./useAuth";

const ADMIN = { id: 7, email: "root@example.com", role: "ADMIN" as const };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function setup() {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => {
  clearAccessToken();
  clearLoggedOutLocally();
});
afterEach(() => {
  vi.unstubAllGlobals();
  clearAccessToken();
  useToastStore.setState({ toasts: [] });
});

describe("useSession", () => {
  it("expone el usuario con su rol", async () => {
    setAccessToken("jwt");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ data: ADMIN })));
    const { wrapper } = setup();

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(ADMIN));
    expect(result.current.data?.role).toBe("ADMIN");
  });

  it("sin token, la recupera por el refresh y deja el rol en la caché", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ data: { token: "nuevo", user: ADMIN } })));
    const { wrapper, client } = setup();

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(ADMIN));
    expect(client.getQueryData(queryKeys.session)).toEqual(ADMIN);
    expect(getAccessToken()).toBe("nuevo");
  });

  it("sin token ni refresh válido, la sesión es null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(json({ error: { code: "UNAUTHENTICATED", message: "x" } }, 401))));
    const { wrapper } = setup();
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

describe("useLogin / useLogout", () => {
  it("login guarda el token y deja el usuario en la caché de la sesión", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ data: { token: "jwt-9", user: ADMIN } })));
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(() => result.current.mutateAsync({ email: ADMIN.email, password: "x" }));

    expect(getAccessToken()).toBe("jwt-9");
    expect(client.getQueryData(queryKeys.session)).toEqual(ADMIN);
  });

  it("logout llama al backend, borra el token y termina la sesión", async () => {
    setAccessToken("jwt");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { wrapper, client } = setup();
    client.setQueryData(queryKeys.session, ADMIN);
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(() => result.current.mutateAsync());

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/auth/logout");
    expect(getAccessToken()).toBeNull();
    expect(client.getQueryData(queryKeys.session)).toBeNull();
  });

  it("logout con el backend caído borra el token, termina la sesión y avisa", async () => {
    setAccessToken("jwt");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { wrapper, client } = setup();
    client.setQueryData(queryKeys.session, ADMIN);
    const { result } = renderHook(() => useLogout(), { wrapper });

    await act(() => result.current.mutateAsync().catch(() => undefined));

    expect(getAccessToken()).toBeNull();
    expect(client.getQueryData(queryKeys.session)).toBeNull();
    await waitFor(() => expect(useToastStore.getState().toasts[0]?.type).toBe("error"));
    expect(useToastStore.getState().toasts[0]?.message).toMatch(/no pudo revocarla/);
    expect(isLoggedOutLocally()).toBe(true);
  });

  it("tras un logout fallido, recargar la sesión no la restaura hasta un nuevo login", async () => {
    setAccessToken("jwt");
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    const first = setup();
    const logout = renderHook(() => useLogout(), { wrapper: first.wrapper });
    await act(() => logout.result.current.mutateAsync().catch(() => undefined));
    fetchMock.mockClear();

    const reloaded = setup();
    const { result } = renderHook(() => useSession(), { wrapper: reloaded.wrapper });
    await waitFor(() => expect(result.current.data).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(json({ data: { token: "jwt-9", user: ADMIN } }));
    const login = renderHook(() => useLogin(), { wrapper: reloaded.wrapper });
    await act(() => login.result.current.mutateAsync({ email: ADMIN.email, password: "x" }));
    expect(isLoggedOutLocally()).toBe(false);
  });
});

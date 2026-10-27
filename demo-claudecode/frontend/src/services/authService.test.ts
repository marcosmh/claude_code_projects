import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiClient";
import { authService } from "./authService";
import { clearLoggedOutLocally, isLoggedOutLocally, markLoggedOutLocally } from "./sessionFlags";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const unauthorized = () => json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión" } }, 401);

const user = { id: 1, email: "ana@example.com", role: "USER" as const };
const sessionBody = () => json({ data: { user } });
type Call = [string, RequestInit];
const paths = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.map((c) => (c as Call)[0].replace("/api/v1", ""));

beforeEach(() => {
  window.localStorage.clear();
  clearLoggedOutLocally();
});
afterEach(() => vi.unstubAllGlobals());

describe("authService", () => {
  it("login envía las credenciales con cookies, no guarda ningún token y devuelve el usuario con rol", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sessionBody());
    vi.stubGlobal("fetch", fetchMock);

    expect(await authService.login("ana@example.com", "secreto")).toEqual(user);

    const [url, init] = fetchMock.mock.calls[0] as Call;
    expect(url).toBe("/api/v1/auth/login");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ email: "ana@example.com", password: "secreto" });
    expect(window.localStorage.getItem("accessToken")).toBeNull();
  });

  it("login propaga el 401 como ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(authService.login("a@b.co", "x")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });

  it("logout hace POST con cookies y acepta el 204", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.logout()).resolves.toBeUndefined();
    const init = (fetchMock.mock.calls[0] as Call)[1];
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(isLoggedOutLocally()).toBe(false);
  });

  it("logout deja la marca local si el backend falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(authService.logout()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    expect(isLoggedOutLocally()).toBe(true);
  });

  it("logout reintenta una vez ante un fallo de red y, si el segundo intento funciona, no deja marca", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("x")).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.logout()).resolves.toBeUndefined();
    expect(paths(fetchMock)).toEqual(["/auth/logout", "/auth/logout"]);
    expect(isLoggedOutLocally()).toBe(false);
  });

  it("logout reintenta una sola vez ante un 5xx y luego marca", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response("boom", { status: 503 })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.logout()).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(isLoggedOutLocally()).toBe(true);
  });

  it("logout no reintenta un 429 pero deja la marca", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response("{}", { status: 429 })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.logout()).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(isLoggedOutLocally()).toBe(true);
  });

  it("con la marca de logout fallido, me no restaura la sesión con la cookie viva", async () => {
    markLoggedOutLocally();
    const fetchMock = vi.fn().mockResolvedValue(sessionBody());
    vi.stubGlobal("fetch", fetchMock);
    expect(await authService.me()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un login correcto limpia la marca y me vuelve a restaurar la sesión", async () => {
    markLoggedOutLocally();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(sessionBody()).mockResolvedValueOnce(json({ data: user })));
    await authService.login("ana@example.com", "secreto");
    expect(isLoggedOutLocally()).toBe(false);

    expect(await authService.me()).toEqual(user);
  });

  it("un login fallido conserva la marca", async () => {
    markLoggedOutLocally();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(authService.login("a@b.co", "x")).rejects.toMatchObject({ status: 401 });
    expect(isLoggedOutLocally()).toBe(true);
  });

  it("changePassword envía ambas contraseñas y luego pide cookies nuevas", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(sessionBody());
    vi.stubGlobal("fetch", fetchMock);

    await expect(authService.changePassword("vieja", "nueva contraseña larga")).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0] as Call;
    expect(url).toBe("/api/v1/auth/password");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ currentPassword: "vieja", newPassword: "nueva contraseña larga" });
    expect(paths(fetchMock)).toEqual(["/auth/password", "/auth/refresh"]);
  });

  it("changePassword no falla si la renovación posterior falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(unauthorized()));
    await expect(authService.changePassword("a", "b")).resolves.toBeUndefined();
  });

  it("changePassword con el access token caducado renueva y repite una vez", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(sessionBody())
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(sessionBody());
    vi.stubGlobal("fetch", fetchMock);
    await authService.changePassword("a", "b");
    expect(paths(fetchMock)).toEqual(["/auth/password", "/auth/refresh", "/auth/password", "/auth/refresh"]);
  });

  it("changePassword propaga un 422 sin renovar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ error: { code: "UNPROCESSABLE", message: "No coincide" } }, 422));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.changePassword("a", "b")).rejects.toMatchObject({ status: 422 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("changePassword con 401 y sin sesión recuperable propaga el 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(authService.changePassword("a", "b")).rejects.toMatchObject({ status: 401 });
  });

  it("me devuelve el usuario (con rol) usando las cookies, sin Authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: user }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await authService.me()).toEqual(user);
    const init = (fetchMock.mock.calls[0] as Call)[1];
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  it("me con el access token ausente o caducado (401) recupera la sesión por el refresh", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(sessionBody());
    vi.stubGlobal("fetch", fetchMock);
    expect(await authService.me()).toEqual(user);
    expect(paths(fetchMock)).toEqual(["/auth/me", "/auth/refresh"]);
  });

  it("me devuelve null si ni el access token ni el refresh valen, y propaga otros errores", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    expect(await authService.me()).toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    expect(await authService.me()).toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 502 })));
    await expect(authService.me()).rejects.toBeInstanceOf(ApiError);
  });

  it("me propaga un fallo de red (no es 'sin sesión')", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(authService.me()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

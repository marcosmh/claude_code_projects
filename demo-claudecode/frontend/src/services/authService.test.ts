import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiClient";
import { authService } from "./authService";
import { clearAccessToken, clearLoggedOutLocally, getAccessToken, isLoggedOutLocally, markLoggedOutLocally, setAccessToken } from "./tokenStorage";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const unauthorized = () => json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión" } }, 401);

const user = { id: 1, email: "ana@example.com", role: "USER" as const };
const sessionBody = (token: string) => json({ data: { token, user } });
type Call = [string, RequestInit];
const paths = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.map((c) => (c as Call)[0].replace("http://localhost:4000/api/v1", ""));

beforeEach(() => {
  window.localStorage.clear();
  clearAccessToken();
  clearLoggedOutLocally();
});
afterEach(() => vi.unstubAllGlobals());

describe("authService", () => {
  it("login envía las credenciales con cookies, guarda el token y devuelve el usuario con rol", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sessionBody("jwt-1"));
    vi.stubGlobal("fetch", fetchMock);

    expect(await authService.login("ana@example.com", "secreto")).toEqual(user);

    const [url, init] = fetchMock.mock.calls[0] as Call;
    expect(url).toBe("http://localhost:4000/api/v1/auth/login");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ email: "ana@example.com", password: "secreto" });
    expect(getAccessToken()).toBe("jwt-1");
  });

  it("login propaga el 401 como ApiError y no guarda token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(authService.login("a@b.co", "x")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    expect(getAccessToken()).toBeNull();
  });

  it("logout hace POST con cookies, acepta el 204 y borra el token", async () => {
    setAccessToken("jwt-1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.logout()).resolves.toBeUndefined();
    const init = (fetchMock.mock.calls[0] as Call)[1];
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(getAccessToken()).toBeNull();
  });

  it("logout borra el token aunque el backend falle y deja la marca local", async () => {
    setAccessToken("jwt-1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(authService.logout()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    expect(getAccessToken()).toBeNull();
    expect(isLoggedOutLocally()).toBe(true);
  });

  it("logout reintenta una vez ante un fallo de red y, si el segundo intento funciona, no deja marca", async () => {
    setAccessToken("jwt-1");
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
    const fetchMock = vi.fn().mockResolvedValue(sessionBody("recuperado"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await authService.me()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it("un login correcto limpia la marca y me vuelve a restaurar la sesión", async () => {
    markLoggedOutLocally();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(sessionBody("jwt-2"))));
    await authService.login("ana@example.com", "secreto");
    expect(isLoggedOutLocally()).toBe(false);

    clearAccessToken();
    expect(await authService.me()).toEqual(user);
  });

  it("un login fallido conserva la marca", async () => {
    markLoggedOutLocally();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(authService.login("a@b.co", "x")).rejects.toMatchObject({ status: 401 });
    expect(isLoggedOutLocally()).toBe(true);
  });

  it("changePassword envía ambas contraseñas y luego pide un access token nuevo", async () => {
    setAccessToken("viejo");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(sessionBody("nuevo"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authService.changePassword("vieja", "nueva contraseña larga")).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0] as Call;
    expect(url).toBe("http://localhost:4000/api/v1/auth/password");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ currentPassword: "vieja", newPassword: "nueva contraseña larga" });
    expect(paths(fetchMock)).toEqual(["/auth/password", "/auth/refresh"]);
    expect(getAccessToken()).toBe("nuevo");
  });

  it("changePassword no falla si la renovación posterior falla: queda sin token", async () => {
    setAccessToken("viejo");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(unauthorized()));
    await expect(authService.changePassword("a", "b")).resolves.toBeUndefined();
    expect(getAccessToken()).toBeNull();
  });

  it("changePassword con el access token caducado renueva y repite una vez", async () => {
    setAccessToken("caducado");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(sessionBody("t2"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(sessionBody("t3"));
    vi.stubGlobal("fetch", fetchMock);
    await authService.changePassword("a", "b");
    expect(paths(fetchMock)).toEqual(["/auth/password", "/auth/refresh", "/auth/password", "/auth/refresh"]);
    expect(getAccessToken()).toBe("t3");
  });

  it("changePassword propaga un 422 sin renovar", async () => {
    setAccessToken("viejo");
    const fetchMock = vi.fn().mockResolvedValue(json({ error: { code: "UNPROCESSABLE", message: "No coincide" } }, 422));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.changePassword("a", "b")).rejects.toMatchObject({ status: 422 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("changePassword con 401 y sin sesión recuperable propaga el 401", async () => {
    setAccessToken("caducado");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(authService.changePassword("a", "b")).rejects.toMatchObject({ status: 401 });
  });

  it("me devuelve el usuario (con rol) usando el Bearer guardado", async () => {
    setAccessToken("jwt-1");
    const fetchMock = vi.fn().mockResolvedValue(json({ data: user }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await authService.me()).toEqual(user);
    expect(((fetchMock.mock.calls[0] as Call)[1].headers as Record<string, string>).Authorization).toBe("Bearer jwt-1");
  });

  it("me sin token recupera la sesión por el refresh antes de darla por perdida", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sessionBody("recuperado"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await authService.me()).toEqual(user);
    expect(paths(fetchMock)).toEqual(["/auth/refresh"]);
    expect(getAccessToken()).toBe("recuperado");
  });

  it("me con token caducado (401) recupera la sesión por el refresh", async () => {
    setAccessToken("caducado");
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(sessionBody("t2"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await authService.me()).toEqual(user);
    expect(paths(fetchMock)).toEqual(["/auth/me", "/auth/refresh"]);
  });

  it("me devuelve null si ni el token ni el refresh valen, y propaga otros errores", async () => {
    setAccessToken("caducado");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    expect(await authService.me()).toBeNull();
    expect(getAccessToken()).toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    expect(await authService.me()).toBeNull();

    setAccessToken("t");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 502 })));
    await expect(authService.me()).rejects.toBeInstanceOf(ApiError);
  });

  it("me sin token propaga un fallo de red del refresh (no es 'sin sesión')", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(authService.me()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

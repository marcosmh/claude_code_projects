import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, buildUrl, refreshSession, request, setUnauthorizedHandler } from "./apiClient";
import { clearAccessToken, getAccessToken, setAccessToken } from "./tokenStorage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  window.localStorage.clear();
  clearAccessToken();
});
afterEach(() => vi.unstubAllGlobals());

describe("apiClient", () => {
  it("devuelve la envoltura { data, meta }", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [1], meta: { page: 1 } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await request<number[], { page: number }>("/invoices", { query: { page: 1, search: "" } });

    expect(result).toEqual({ data: [1], meta: { page: 1 } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/api/v1/invoices?page=1");
  });

  it("envía el cuerpo como JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: {} }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await request("/invoices", { method: "POST", body: { a: 1 } });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("trata 204 como sin datos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(request("/invoices/1", { method: "DELETE" })).resolves.toEqual({ data: undefined });
  });

  it("convierte { error } en ApiError con code, message y details", async () => {
    const body = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos de entrada inválidos",
        details: [{ field: "clientName", message: "El cliente es obligatorio" }, { message: "general" }, 42],
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(body, 400)));

    const error = await request("/invoices", { method: "POST", body: {} }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Datos de entrada inválidos",
      details: [{ field: "clientName", message: "El cliente es obligatorio" }, { message: "general" }],
    });
  });

  it("un 429 usa Retry-After para un mensaje con la espera exacta", async () => {
    const body = { error: { code: "RATE_LIMITED", message: "texto del servidor" } };
    const res = new Response(JSON.stringify(body), { status: 429, headers: { "Retry-After": "42" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));

    const error = await request("/invoices").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, code: "RATE_LIMITED", retryAfter: 42 });
    expect((error as ApiError).message).toBe("Has hecho demasiadas peticiones. Espera 42 s e inténtalo de nuevo.");
  });

  it("un 429 sin Retry-After válido da un mensaje genérico de espera", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429, headers: { "Retry-After": "abc" } })));
    const error = await request("/invoices").catch((e: unknown) => e);
    expect((error as ApiError).retryAfter).toBeUndefined();
    expect((error as ApiError).message).toMatch(/Espera unos segundos/);
  });

  it("usa un mensaje genérico si el error no es JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 502 })));
    await expect(request("/x")).rejects.toMatchObject({ status: 502, code: "UNKNOWN_ERROR" });
  });

  it("convierte un fallo de red en ApiError NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(request("/x")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("deja pasar el AbortError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("abort", "AbortError")));
    await expect(request("/x")).rejects.toMatchObject({ name: "AbortError" });
  });

  it("buildUrl omite parámetros vacíos", () => {
    expect(buildUrl("/invoices", { status: "PAID", search: undefined, page: 2 })).toBe(
      "http://localhost:4000/api/v1/invoices?status=PAID&page=2",
    );
  });
});

describe("request: sesión con JWT", () => {
  const unauthorized = () => json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión" } }, 401);
  const session = (token: string) => json({ data: { token, user: { id: 1, email: "a@b.co", role: "USER" } } });
  type Call = [string, RequestInit];
  const authHeader = (call: unknown) => (((call as Call)[1].headers ?? {}) as Record<string, string>).Authorization;
  const urlOf = (call: unknown) => (call as Call)[0].replace("http://localhost:4000/api/v1", "");

  afterEach(() => {
    setUnauthorizedHandler(undefined);
    vi.restoreAllMocks();
  });

  it("envía Authorization: Bearer con el token guardado y sin credentials en rutas normales", async () => {
    setAccessToken("tok-1");
    const fetchMock = vi.fn().mockResolvedValue(json({ data: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await request("/invoices");

    const init = (fetchMock.mock.calls[0] as Call)[1];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-1");
    expect(init.credentials).toBeUndefined();
  });

  it("sin token no envía Authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await request("/invoices");
    expect(authHeader(fetchMock.mock.calls[0])).toBeUndefined();
  });

  it.each(["/auth/login", "/auth/refresh", "/auth/logout", "/auth/password"])("%s envía credentials: include", async (path) => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await request(path, { method: "POST" });
    expect((fetchMock.mock.calls[0] as Call)[1].credentials).toBe("include");
  });

  it("/auth/me lleva Bearer pero no credentials", async () => {
    setAccessToken("tok-1");
    const fetchMock = vi.fn().mockResolvedValue(json({ data: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await request("/auth/me");
    expect(authHeader(fetchMock.mock.calls[0])).toBe("Bearer tok-1");
    expect((fetchMock.mock.calls[0] as Call)[1].credentials).toBeUndefined();
  });

  it("ante un 401 renueva con /auth/refresh y repite la petición una vez con el token nuevo", async () => {
    setAccessToken("viejo");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(session("nuevo"))
      .mockResolvedValueOnce(json({ data: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(request("/invoices")).resolves.toEqual({ data: "ok" });

    expect(fetchMock.mock.calls.map(urlOf)).toEqual(["/invoices", "/auth/refresh", "/invoices"]);
    expect((fetchMock.mock.calls[1] as Call)[1].credentials).toBe("include");
    expect(authHeader(fetchMock.mock.calls[2])).toBe("Bearer nuevo");
    expect(getAccessToken()).toBe("nuevo");
    expect(handler).not.toHaveBeenCalled();
  });

  it("peticiones concurrentes con 401 comparten UN solo refresh (single-flight)", async () => {
    setAccessToken("viejo");
    let resolveRefresh: (r: Response) => void = () => undefined;
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return new Promise<Response>((r) => (resolveRefresh = r));
      const bearer = (init.headers as Record<string, string>).Authorization;
      return Promise.resolve(bearer === "Bearer nuevo" ? json({ data: url }) : unauthorized());
    });
    vi.stubGlobal("fetch", fetchMock);

    const all = Promise.all([request("/invoices"), request("/stats/summary"), request("/invoices/1")]);
    await vi.waitFor(() => expect(fetchMock.mock.calls.filter((c) => urlOf(c) === "/auth/refresh")).toHaveLength(1));
    resolveRefresh(session("nuevo"));

    expect((await all).map((r) => r.data)).toHaveLength(3);
    expect(fetchMock.mock.calls.filter((c) => urlOf(c) === "/auth/refresh")).toHaveLength(1);
  });

  it("una petición que falló con un token ya sustituido se repite sin pedir otro refresh", async () => {
    setAccessToken("viejo");
    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      setAccessToken("nuevo"); // otra petición renovó mientras esta estaba en vuelo
      return unauthorized();
    });
    fetchMock.mockResolvedValueOnce(json({ data: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/invoices")).resolves.toEqual({ data: "ok" });
    expect(fetchMock.mock.calls.map(urlOf)).toEqual(["/invoices", "/invoices"]);
    expect(authHeader(fetchMock.mock.calls[1])).toBe("Bearer nuevo");
  });

  it("si el reintento vuelve a dar 401 no hay bucle: borra el token y avisa al manejador", async () => {
    setAccessToken("viejo");
    const fetchMock = vi.fn((url: string) => Promise.resolve(url.endsWith("/auth/refresh") ? session("nuevo") : unauthorized()));
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(request("/invoices")).rejects.toMatchObject({ status: 401 });

    expect(fetchMock.mock.calls.map(urlOf)).toEqual(["/invoices", "/auth/refresh", "/invoices"]);
    expect(getAccessToken()).toBeNull();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("si el refresh responde 401: borra el token, avisa al manejador y lanza el 401 original", async () => {
    setAccessToken("viejo");
    const fetchMock = vi.fn(() => Promise.resolve(unauthorized()));
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(request("/invoices")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });

    expect(fetchMock.mock.calls.map(urlOf)).toEqual(["/invoices", "/auth/refresh"]);
    expect(getAccessToken()).toBeNull();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("un fallo de red en el refresh no cierra la sesión: se propaga el error", async () => {
    setAccessToken("viejo");
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized()).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(request("/invoices")).rejects.toMatchObject({ code: "NETWORK_ERROR" });

    expect(getAccessToken()).toBe("viejo");
    expect(handler).not.toHaveBeenCalled();
  });

  it("un 401 en /auth/* no renueva ni avisa (respuesta esperada)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(unauthorized());
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(request("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(handler).not.toHaveBeenCalled();
  });

  it("un 401 sin manejador registrado no rompe", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(request("/invoices")).rejects.toMatchObject({ status: 401 });
  });

  it("refreshSession guarda el token nuevo y devuelve el usuario con su rol", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(session("t2")));
    await expect(refreshSession()).resolves.toEqual({ token: "t2", user: { id: 1, email: "a@b.co", role: "USER" } });
    expect(getAccessToken()).toBe("t2");
  });
});

describe("tokenStorage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("guarda y borra el token en localStorage", () => {
    setAccessToken("abc");
    expect(window.localStorage.getItem("accessToken")).toBe("abc");
    clearAccessToken();
    expect(window.localStorage.getItem("accessToken")).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("si localStorage no está disponible usa la memoria sin lanzar", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(() => setAccessToken("mem")).not.toThrow();
    expect(getAccessToken()).toBe("mem");
    expect(() => clearAccessToken()).not.toThrow();
    expect(getAccessToken()).toBeNull();
  });

  it("request sigue enviando Bearer con el respaldo en memoria", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    setAccessToken("mem");
    const fetchMock = vi.fn().mockResolvedValue(json({ data: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await request("/invoices");
    expect(((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>).Authorization).toBe("Bearer mem");
  });
});

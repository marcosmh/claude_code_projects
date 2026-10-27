import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, buildUrl, refreshSession, request, setUnauthorizedHandler } from "./apiClient";
import { clearLoggedOutLocally, isLoggedOutLocally, lastRefreshAt, markLoggedOutLocally, purgeLegacyAccessToken } from "./sessionFlags";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("apiClient", () => {
  it("devuelve la envoltura { data, meta }", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [1], meta: { page: 1 } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await request<number[], { page: number }>("/invoices", { query: { page: 1, search: "" } });

    expect(result).toEqual({ data: [1], meta: { page: 1 } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/invoices?page=1");
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
      "/api/v1/invoices?status=PAID&page=2",
    );
  });
});

describe("request: sesión con cookies httpOnly", () => {
  const unauthorized = () => json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión" } }, 401);
  const USER = { id: 1, email: "a@b.co", role: "USER" };
  const session = () => json({ data: { user: USER } });
  type Call = [string, RequestInit];
  const urlOf = (call: unknown) => (call as Call)[0].replace("/api/v1", "");

  afterEach(() => {
    setUnauthorizedHandler(undefined);
    vi.restoreAllMocks();
  });

  it.each(["/invoices", "/auth/me", "/auth/login", "/auth/refresh", "/auth/logout", "/auth/password"])(
    "%s envía credentials: include y nunca Authorization",
    async (path) => {
      const fetchMock = vi.fn().mockResolvedValue(json({ data: {} }));
      vi.stubGlobal("fetch", fetchMock);
      await request(path);
      const init = (fetchMock.mock.calls[0] as Call)[1];
      expect(init.credentials).toBe("include");
      expect((init.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
    },
  );

  it("ante un 401 renueva con /auth/refresh y repite la petición una vez", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(session())
      .mockResolvedValueOnce(json({ data: [1] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/invoices")).resolves.toEqual({ data: [1] });

    expect(fetchMock.mock.calls.map(urlOf)).toEqual(["/invoices", "/auth/refresh", "/invoices"]);
    expect((fetchMock.mock.calls[1] as Call)[1].method).toBe("POST");
    expect(lastRefreshAt()).toBeGreaterThan(0);
  });

  it("varias peticiones con 401 a la vez comparten un único refresh y todas se repiten", async () => {
    let refreshed = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        await Promise.resolve();
        refreshed = true;
        return session();
      }
      return refreshed ? json({ data: url }) : unauthorized();
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all([request("/invoices"), request("/stats/summary"), request("/stats/monthly")]);

    expect(results).toHaveLength(3);
    expect(fetchMock.mock.calls.filter((c) => urlOf(c) === "/auth/refresh")).toHaveLength(1);
  });

  it("si otra pestaña renovó después de enviar la petición, se repite sin pedir otro refresh", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.resetModules();
      const tab = await import("./apiClient");
      const flags = await import("./sessionFlags");
      vi.setSystemTime(1_000);
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(async () => {
          vi.setSystemTime(2_000);
          flags.markRefreshedNow(); // otra pestaña renovó mientras esta petición estaba en vuelo
          return unauthorized();
        })
        .mockResolvedValueOnce(json({ data: "ok" }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(tab.request("/invoices")).resolves.toEqual({ data: "ok" });

      expect(fetchMock.mock.calls.map(urlOf)).toEqual(["/invoices", "/invoices"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("si el reintento vuelve a dar 401 no hay bucle: avisa al manejador", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(session()).mockResolvedValueOnce(unauthorized());
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(request("/invoices")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("si el refresh responde 401: avisa al manejador y lanza el 401 original", async () => {
    const fetchMock = vi.fn().mockResolvedValue(unauthorized());
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(request("/invoices")).rejects.toMatchObject({ status: 401 });

    expect(fetchMock.mock.calls.map(urlOf)).toEqual(["/invoices", "/auth/refresh"]);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("un fallo de red en el refresh no cierra la sesión: se propaga el error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(unauthorized()).mockRejectedValueOnce(new TypeError("Failed to fetch")));
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(request("/invoices")).rejects.toMatchObject({ code: "NETWORK_ERROR" });

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

  it("refreshSession devuelve el usuario con su rol y marca la renovación", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(session()));
    await expect(refreshSession()).resolves.toEqual({ user: USER });
    expect(lastRefreshAt()).toBeGreaterThan(0);
  });
});

describe("refresh entre pestañas (Web Locks)", () => {
  const unauthorized = () => json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión" } }, 401);
  const session = () => json({ data: { user: { id: 1, email: "a@b.co", role: "USER" } } });
  const urlOf = (call: unknown) => (call as [string])[0].replace("/api/v1", "");

  /** Lock exclusivo FIFO, como `navigator.locks.request(name, cb)` con el mismo nombre. */
  function installFakeLocks() {
    let tail: Promise<unknown> = Promise.resolve();
    const request = vi.fn(<T,>(_name: string, task: () => Promise<T>) => {
      const run = tail.then(task, task);
      tail = run.catch(() => undefined);
      return run;
    });
    vi.stubGlobal("navigator", { ...window.navigator, locks: { request } });
    return request;
  }

  afterEach(() => {
    setUnauthorizedHandler(undefined);
    vi.useRealTimers();
    vi.resetModules();
  });

  it("dos pestañas con 401 a la vez hacen UN solo refresh y la segunda reutiliza la renovación", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const lock = installFakeLocks();
    // Dos instancias del módulo = dos pestañas (cada una con su single-flight), con el localStorage compartido.
    vi.resetModules();
    const tabA = await import("./apiClient");
    vi.resetModules();
    const tabB = await import("./apiClient");
    expect(tabA.request).not.toBe(tabB.request);
    vi.setSystemTime(1_000);

    let refreshed = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        await Promise.resolve();
        vi.setSystemTime(2_000); // el instante lo guarda en localStorage la pestaña que renueva
        refreshed = true;
        return session();
      }
      return refreshed ? json({ data: url }) : unauthorized();
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all([tabA.request("/invoices"), tabB.request("/stats/summary")]);

    expect(results).toHaveLength(2);
    expect(fetchMock.mock.calls.filter((c) => urlOf(c) === "/auth/refresh")).toHaveLength(1);
    expect(lock).toHaveBeenCalledWith("refresh", expect.any(Function));
    expect(Number(window.localStorage.getItem("refreshedAt"))).toBe(2_000);
  });

  it("dentro del lock, si el refresh falla por red no cierra la sesión y libera el lock", async () => {
    installFakeLocks();
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(unauthorized()).mockRejectedValueOnce(new TypeError("x")));

    await expect(request("/invoices")).rejects.toMatchObject({ code: "NETWORK_ERROR" });

    expect(handler).not.toHaveBeenCalled();
    // El lock quedó libre: un nuevo intento puede renovar.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(session()));
    await expect(refreshSession()).resolves.toMatchObject({ user: { id: 1 } });
  });

  it("sin Locks API (navigator.locks ausente) el refresh sigue funcionando", async () => {
    vi.stubGlobal("navigator", { ...window.navigator, locks: undefined });
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(session()).mockResolvedValueOnce(json({ data: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/invoices")).resolves.toEqual({ data: "ok" });
    expect(fetchMock.mock.calls.map(urlOf)).toEqual(["/invoices", "/auth/refresh", "/invoices"]);
  });
});

describe("sessionFlags", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearLoggedOutLocally();
  });

  it("la marca loggedOut se guarda y se borra en localStorage", () => {
    markLoggedOutLocally();
    expect(window.localStorage.getItem("loggedOut")).toBe("1");
    expect(isLoggedOutLocally()).toBe(true);
    clearLoggedOutLocally();
    expect(window.localStorage.getItem("loggedOut")).toBeNull();
    expect(isLoggedOutLocally()).toBe(false);
  });

  it("purgeLegacyAccessToken borra el access token que guardaban versiones anteriores", () => {
    window.localStorage.setItem("accessToken", "viejo");
    purgeLegacyAccessToken();
    expect(window.localStorage.getItem("accessToken")).toBeNull();
  });

  it("si localStorage no está disponible usa la memoria sin lanzar", () => {
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });
    }

    expect(() => markLoggedOutLocally()).not.toThrow();
    expect(isLoggedOutLocally()).toBe(true);
    expect(() => clearLoggedOutLocally()).not.toThrow();
    expect(isLoggedOutLocally()).toBe(false);
    expect(() => purgeLegacyAccessToken()).not.toThrow();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, buildUrl, request } from "./apiClient";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

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

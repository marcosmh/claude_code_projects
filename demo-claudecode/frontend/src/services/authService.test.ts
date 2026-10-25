import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiClient";
import { authService } from "./authService";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const unauthorized = () => json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión" } }, 401);

afterEach(() => vi.unstubAllGlobals());

describe("authService", () => {
  it("login envía las credenciales por POST con cookies y devuelve el usuario", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { id: 1, email: "ana@example.com" } }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await authService.login("ana@example.com", "secreto")).toEqual({ id: 1, email: "ana@example.com" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/v1/auth/login");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ email: "ana@example.com", password: "secreto" });
  });

  it("login propaga el 401 como ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    await expect(authService.login("a@b.co", "x")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });

  it("logout hace POST y acepta el 204", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.logout()).resolves.toBeUndefined();
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe("POST");
  });

  it("changePassword envía ambas contraseñas y acepta el 204", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.changePassword("vieja", "nueva contraseña larga")).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/v1/auth/password");
    expect(JSON.parse(init.body as string)).toEqual({ currentPassword: "vieja", newPassword: "nueva contraseña larga" });
  });

  it("me devuelve el usuario, null sin sesión y propaga otros errores", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ data: { id: 2, email: "b@b.co" } })));
    expect(await authService.me()).toEqual({ id: 2, email: "b@b.co" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorized()));
    expect(await authService.me()).toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 502 })));
    await expect(authService.me()).rejects.toBeInstanceOf(ApiError);
  });
});

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => fetchMock.mockReset());

const ana = { id: "u1", email: "ana@x.mx", name: "Ana", role: "USER" };
const admin = { id: "a1", email: "admin@x.mx", name: "Admin", role: "ADMIN" };

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

function backendResponds(body: unknown, status = 200) {
  fetchMock.mockImplementation(async () => Response.json(body, { status }));
}

describe("proxy", () => {
  it("deja pasar las rutas públicas sin consultar al backend", async () => {
    const response = await proxy(request("/properties"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin sesión redirige a /login recordando la ruta pedida", async () => {
    backendResponds({ message: "No has iniciado sesión", status: 401 }, 401);
    const response = await proxy(request("/admin/properties?page=2"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fadmin%2Fproperties%3Fpage%3D2",
    );
  });

  it("reenvía la cookie de sesión al backend", async () => {
    backendResponds(ana);
    await proxy(request("/account", "portal_session=abc"));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/auth/me");
    expect((init.headers as Record<string, string>).cookie).toBe("portal_session=abc");
  });

  it("un USER entra a /account", async () => {
    backendResponds(ana);
    const response = await proxy(request("/account"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("un USER recibe 403 (reescritura a /forbidden) en /admin", async () => {
    backendResponds(ana);
    const response = await proxy(request("/admin"));

    expect(response.status).toBe(403);
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/forbidden");
  });

  it("un ADMIN entra a /admin", async () => {
    backendResponds(admin);
    const response = await proxy(request("/admin"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("un ADMIN en /account (usuario final) vuelve a /admin", async () => {
    backendResponds(admin);
    for (const path of ["/account", "/account/edit"]) {
      const response = await proxy(request(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin");
    }
  });

  it("si el backend no responde, falla cerrado: redirige a /login", async () => {
    fetchMock.mockRejectedValue(new Error("backend caído"));
    const response = await proxy(request("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=%2Fadmin");
  });

  it("si el backend responde un error de servidor, falla cerrado", async () => {
    backendResponds({ message: "Error interno del servidor", status: 500 }, 500);
    const response = await proxy(request("/account"));
    expect(response.status).toBe(307);
  });
});

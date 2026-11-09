import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentUserUrl,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "./auth-client";
import { ApiRequestError } from "./properties-client";

const user = { id: "u1", email: "ana@example.com", name: "Ana", role: "USER" as const };

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("registerUser", () => {
  it("envía los datos como JSON a /api/auth/register y devuelve el usuario", async () => {
    const fetchMock = stubFetch(Response.json(user, { status: 201 }));
    const input = { name: "Ana", email: "ana@example.com", password: "clave-segura-1" };

    expect(await registerUser(input)).toEqual(user);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/register");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it("propaga el mensaje y el estado de la API (409)", async () => {
    stubFetch(
      Response.json(
        { message: "Ya existe una cuenta con este email", status: 409 },
        { status: 409 },
      ),
    );

    const error = await registerUser({ name: "Ana", email: "a@b.co", password: "12345678" }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 409, message: "Ya existe una cuenta con este email" });
  });

  it("usa un mensaje genérico si la respuesta de error no es JSON", async () => {
    stubFetch(new Response("boom", { status: 502 }));
    await expect(
      registerUser({ name: "Ana", email: "a@b.co", password: "12345678" }),
    ).rejects.toMatchObject({ status: 502, message: "No se pudo crear la cuenta" });
  });
});

describe("loginUser", () => {
  it("devuelve el usuario autenticado", async () => {
    const fetchMock = stubFetch(Response.json(user));
    expect(await loginUser({ email: "ana@example.com", password: "x" })).toEqual(user);
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("/api/auth/login");
  });

  it("conserva el mensaje de credenciales incorrectas (401)", async () => {
    stubFetch(
      Response.json({ message: "Email o contraseña incorrectos", status: 401 }, { status: 401 }),
    );
    await expect(loginUser({ email: "ana@example.com", password: "mala" })).rejects.toMatchObject({
      status: 401,
      message: "Email o contraseña incorrectos",
    });
  });
});

describe("logoutUser", () => {
  it("llama a POST /api/auth/logout", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    await logoutUser();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/logout");
    expect(init.method).toBe("POST");
  });

  it("lanza ApiRequestError si falla", async () => {
    stubFetch(new Response(null, { status: 500 }));
    await expect(logoutUser()).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("fetchCurrentUser", () => {
  it("devuelve el usuario con sesión", async () => {
    const fetchMock = stubFetch(Response.json(user));
    expect(await fetchCurrentUser()).toEqual(user);
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(currentUserUrl);
  });

  it("devuelve null sin sesión (401) en lugar de lanzar", async () => {
    stubFetch(Response.json({ message: "No has iniciado sesión", status: 401 }, { status: 401 }));
    expect(await fetchCurrentUser()).toBeNull();
  });

  it("lanza ante otros errores", async () => {
    stubFetch(new Response(null, { status: 500 }));
    await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 500 });
  });
});

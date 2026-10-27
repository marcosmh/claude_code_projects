import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthController } from "../src/controllers/AuthController";
import { createWithAuth, credentialFrom } from "../src/middleware/withAuth";
import type { AuthService, SessionTokens } from "../src/services/AuthService";
import { accessCookie, accessCookieName, clearedAccessCookie } from "../src/utils/cookies";
import { isSameSiteWrite } from "../src/utils/csrf";

vi.mock("../src/utils/jwt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/utils/jwt")>()),
  getJwtConfig: () => ({ accessTtlSeconds: 900 }),
}));

const ORIGIN = "http://localhost:5173";
const ALLOWED = [ORIGIN];
const req = (method: string, headers: Record<string, string> = {}) => new Request("http://localhost:4000/api/v1/invoices", { method, headers });
const session: SessionTokens = { token: "access.jwt", refreshToken: "refresh.jwt", refreshMaxAgeSeconds: 3600, user: { id: 1, email: "a@b.co", role: "USER" } };

afterEach(() => vi.unstubAllEnvs());

describe("cookie del access token", () => {
  it("es httpOnly, SameSite=Strict, Path=/api/v1 y lleva Secure y prefijo solo en producción", () => {
    expect(accessCookie("tok", 900, false)).toBe("at=tok; Max-Age=900; Path=/api/v1; HttpOnly; SameSite=Strict");
    expect(accessCookie("tok", 900, true)).toBe("__Secure-at=tok; Max-Age=900; Path=/api/v1; HttpOnly; SameSite=Strict; Secure");
    expect(accessCookie("tok", -1, false)).toMatch(/Max-Age=0;/);
    expect(clearedAccessCookie(false)).toBe("at=; Max-Age=0; Path=/api/v1; HttpOnly; SameSite=Strict");
    expect(accessCookieName(true)).toBe("__Secure-at");
  });
});

describe("isSameSiteWrite", () => {
  it("las lecturas siempre pasan", () => {
    expect(isSameSiteWrite(req("GET", { origin: "http://evil.com" }), ALLOWED)).toBe(true);
  });
  it("una escritura necesita Origin permitido o, sin Origin, Fetch Metadata no cross-site", () => {
    expect(isSameSiteWrite(req("POST", { origin: ORIGIN }), ALLOWED)).toBe(true);
    expect(isSameSiteWrite(req("POST", { origin: "http://evil.com" }), ALLOWED)).toBe(false);
    for (const site of ["same-origin", "same-site", "none"]) expect(isSameSiteWrite(req("DELETE", { "sec-fetch-site": site }), ALLOWED)).toBe(true);
    expect(isSameSiteWrite(req("POST", { "sec-fetch-site": "cross-site" }), ALLOWED)).toBe(false);
    expect(isSameSiteWrite(req("POST"), ALLOWED)).toBe(false);
  });
});

describe("credentialFrom (modo dual)", () => {
  it("con el flag apagado (AUTH_COOKIE_ACCESS=0) la cookie se ignora", () => {
    vi.stubEnv("AUTH_COOKIE_ACCESS", "0");
    expect(credentialFrom(req("GET", { cookie: "at=abc" }))).toEqual({ token: null, source: null });
  });
  it("por defecto lee la cookie, y el Bearer gana si llegan los dos", () => {
    vi.stubEnv("AUTH_COOKIE_ACCESS", "1");
    expect(credentialFrom(req("GET", { cookie: "at=abc" }))).toEqual({ token: "abc", source: "cookie" });
    expect(credentialFrom(req("GET", { cookie: "at=abc", authorization: "Bearer xyz" }))).toEqual({ token: "xyz", source: "bearer" });
    expect(credentialFrom(req("GET"))).toEqual({ token: null, source: null });
  });
});

describe("withAuth con cookie", () => {
  const authenticate = vi.fn(async () => session.user);
  const handler = createWithAuth(authenticate)(async () => new Response("ok"));

  it("una escritura por cookie sin Origin ni Fetch Metadata -> 403 y no autentica", async () => {
    vi.stubEnv("AUTH_COOKIE_ACCESS", "1");
    authenticate.mockClear();
    const res = await handler(req("POST", { cookie: "at=abc" }));
    expect(res.status).toBe(403);
    expect(authenticate).not.toHaveBeenCalled();
  });
  it("una escritura por cookie desde el Origin permitido autentica", async () => {
    vi.stubEnv("AUTH_COOKIE_ACCESS", "1");
    expect((await handler(req("POST", { cookie: "at=abc", origin: ORIGIN }))).status).toBe(200);
  });
  it("una escritura con Bearer sin cabeceras de navegador (curl, Postman) sigue pasando", async () => {
    vi.stubEnv("AUTH_COOKIE_ACCESS", "1");
    expect((await handler(req("POST", { authorization: "Bearer xyz" }))).status).toBe(200);
  });
});

describe("AuthController: Set-Cookie", () => {
  const service = { login: vi.fn(async () => session), logout: vi.fn(async () => undefined) };
  const controller = () => new AuthController(service as unknown as AuthService);
  const login = () =>
    new Request("http://localhost:4000/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.co", password: "una-contraseña-larga" }),
    });

  it("con AUTH_COOKIE_ACCESS=0 solo pone la cookie del refresh", async () => {
    vi.stubEnv("AUTH_COOKIE_ACCESS", "0");
    const res = await controller().login(login());
    expect(res.headers.getSetCookie()).toEqual([expect.stringMatching(/^refresh=refresh\.jwt;/)]);
  });
  it("por defecto pone también la cookie del access con la vida del token, y el cuerpo conserva el token", async () => {
    vi.stubEnv("AUTH_COOKIE_ACCESS", "1");
    const res = await controller().login(login());
    expect(res.headers.getSetCookie()).toEqual([
      expect.stringMatching(/^refresh=refresh\.jwt;/),
      "at=access.jwt; Max-Age=900; Path=/api/v1; HttpOnly; SameSite=Strict",
    ]);
    expect((await res.json()).data.token).toBe("access.jwt");
  });
  it("el logout limpia las dos cookies salvo con AUTH_COOKIE_ACCESS=0", async () => {
    vi.stubEnv("AUTH_COOKIE_ACCESS", "0");
    const off = await controller().logout(req("POST"));
    expect(off.headers.getSetCookie()).toHaveLength(1);
    vi.stubEnv("AUTH_COOKIE_ACCESS", "1");
    const on = await controller().logout(req("POST"));
    expect(on.headers.getSetCookie()).toEqual([expect.stringMatching(/^refresh=; Max-Age=0/), expect.stringMatching(/^at=; Max-Age=0/)]);
  });
});

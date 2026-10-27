import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FakeAuthRepository } from "./helpers/FakeAuthRepository";
import type { FakeInvoiceRepository } from "./helpers/FakeInvoiceRepository";

// These tests log in dozens of times with the same few emails: switch the per-email login limit off (it has its own test).
vi.hoisted(() => {
  process.env.RATE_LIMIT_DISABLED = "1";
});

// Route handlers import the container, which imports the Prisma-backed repository: swap it for a fake.
const fake = vi.hoisted(() => ({ repo: undefined as unknown, auth: undefined as unknown }));
vi.mock("../src/repositories", async () => {
  const { FakeInvoiceRepository } = await import("./helpers/FakeInvoiceRepository");
  const { FakeAuthRepository } = await import("./helpers/FakeAuthRepository");
  const repo = new FakeInvoiceRepository();
  fake.repo = repo;
  fake.auth = new FakeAuthRepository(repo);
  return { invoiceRepository: repo, authRepository: fake.auth };
});

import * as loginRoute from "@/app/api/v1/auth/login/route";
import * as logoutRoute from "@/app/api/v1/auth/logout/route";
import * as meRoute from "@/app/api/v1/auth/me/route";
import * as passwordRoute from "@/app/api/v1/auth/password/route";
import * as refreshRoute from "@/app/api/v1/auth/refresh/route";
import { container } from "@/container";
import { loadJwtConfig, signAccessToken } from "@/utils/jwt";
import { decodeJwt } from "jose";
import * as listRoute from "@/app/api/v1/invoices/route";
import * as itemRoute from "@/app/api/v1/invoices/[id]/route";
import * as statusRoute from "@/app/api/v1/invoices/[id]/status/route";
import * as pdfRoute from "@/app/api/v1/invoices/[id]/pdf/route";
import * as summaryRoute from "@/app/api/v1/stats/summary/route";
import * as monthlyRoute from "@/app/api/v1/stats/monthly/route";

const BASE = "http://localhost:4000/api/v1";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
// Access token of the signed-in test user; "" sends no Authorization header. Set in beforeEach / by tests.
let bearer = "";
const json = (method: string, url: string, body?: unknown, extra: Record<string, string> = {}) =>
  new Request(`${BASE}${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...extra },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const body = (over: Record<string, unknown> = {}) => ({
  clientName: "Acme",
  issueDate: "2026-09-01",
  dueDate: "2026-10-01",
  taxRate: 10,
  items: [{ description: "A", quantity: 2, unitPriceCents: 10000 }],
  ...over,
});

async function createOne(over: Record<string, unknown> = {}) {
  const res = await listRoute.POST(json("POST", "/invoices", body(over)));
  return (await res.json()).data as { id: number };
}

const PASSWORD = "correct horse battery";
const refreshCookieOf = (res: Response) => res.headers.get("Set-Cookie")!.split(";")[0];

interface Session {
  token: string;
  refresh: string; // "refresh=<jwt>", as the browser would send it
}

async function loginAs(email: string, password = PASSWORD): Promise<Session> {
  const res = await loginRoute.POST(
    new Request(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
  return { token: (await res.json()).data.token, refresh: refreshCookieOf(res) };
}

async function signUp(email: string, role: "USER" | "ADMIN" = "USER"): Promise<Session> {
  await container.authService.createUser(email, PASSWORD, role);
  return loginAs(email);
}

const postRefresh = (cookie?: string) =>
  refreshRoute.POST(new Request(`${BASE}/auth/refresh`, { method: "POST", headers: cookie ? { Cookie: cookie } : {} }));

beforeEach(async () => {
  const repo = fake.repo as FakeInvoiceRepository;
  const auth = fake.auth as FakeAuthRepository;
  repo.rows.clear();
  repo.owners.clear();
  auth.users.length = 0;
  auth.sessions.clear();
  auth.refreshTokens.length = 0;
  bearer = (await signUp("ana@example.com")).token;
});

describe("invoices routes", () => {
  it("POST crea (201 + Location) y GET devuelve { data }", async () => {
    const res = await listRoute.POST(json("POST", "/invoices", body()));
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(res.headers.get("Location")).toBe(`/api/v1/invoices/${data.id}`);
    expect(data).toMatchObject({ number: expect.stringMatching(/^FAC-\d{4}$/), totalCents: 22000, status: "DRAFT" });

    const got = await itemRoute.GET(json("GET", `/invoices/${data.id}`), ctx(String(data.id)));
    expect(got.status).toBe(200);
    expect((await got.json()).data.id).toBe(data.id);
  });

  it("POST inválido -> 400 con details", async () => {
    const res = await listRoute.POST(json("POST", "/invoices", body({ clientName: "", issueDate: "x" })));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details.map((d: { field: string }) => d.field)).toEqual(expect.arrayContaining(["clientName", "issueDate"]));
  });

  it("POST con JSON roto -> 400", async () => {
    const res = await listRoute.POST(json("POST", "/invoices", "{nope"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", ""])(
    "POST con Content-Type %j -> 400 sin procesar el cuerpo",
    async (contentType) => {
      const req = new Request(`${BASE}/invoices`, {
        method: "POST",
        headers: { ...(contentType ? { "Content-Type": contentType } : {}), Authorization: `Bearer ${bearer}` },
        body: JSON.stringify(body()),
      });
      const res = await listRoute.POST(req);
      expect(res.status).toBe(400);
      expect((await res.json()).error.message).toMatch(/application\/json/);
    },
  );

  it("POST acepta application/json con charset", async () => {
    const req = new Request(`${BASE}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${bearer}` },
      body: JSON.stringify(body()),
    });
    expect((await listRoute.POST(req)).status).toBe(201);
  });

  it("POST que viola regla de negocio -> 422", async () => {
    const res = await listRoute.POST(json("POST", "/invoices", body({ dueDate: "2026-08-01" })));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("UNPROCESSABLE_ENTITY");
  });

  it("GET lista con meta y filtros", async () => {
    await createOne();
    await createOne({ status: "PAID" });
    const res = await listRoute.GET(json("GET", "/invoices?status=PAID&page=1&pageSize=5"));
    const payload = await res.json();
    expect(payload.data).toHaveLength(1);
    expect(payload.meta).toEqual({ page: 1, pageSize: 5, total: 1, totalPages: 1 });
    expect((await listRoute.GET(json("GET", "/invoices?status=BAD"))).status).toBe(400);
  });

  it("GET id inexistente 404 e id inválido 400", async () => {
    const nf = await itemRoute.GET(json("GET", "/invoices/99"), ctx("99"));
    expect(nf.status).toBe(404);
    expect((await nf.json()).error.code).toBe("NOT_FOUND");
    expect((await itemRoute.GET(json("GET", "/invoices/abc"), ctx("abc"))).status).toBe(400);
  });

  it("PUT, PATCH status y DELETE 204", async () => {
    const { id } = await createOne();
    const put = await itemRoute.PUT(json("PUT", `/invoices/${id}`, body({ clientName: "Nuevo" })), ctx(String(id)));
    expect((await put.json()).data.clientName).toBe("Nuevo");

    const patch = await statusRoute.PATCH(json("PATCH", `/invoices/${id}/status`, { status: "SENT" }), ctx(String(id)));
    const patched = (await patch.json()).data;
    expect(patched.status).toBe("SENT");
    expect(patched.isOverdue).toBe(true);
    const badPatch = await statusRoute.PATCH(json("PATCH", `/invoices/${id}/status`, { status: "OVERDUE" }), ctx(String(id)));
    expect(badPatch.status).toBe(400);

    const del = await itemRoute.DELETE(json("DELETE", `/invoices/${id}`), ctx(String(id)));
    expect(del.status).toBe(204);
    expect(await del.text()).toBe("");
    expect((await itemRoute.DELETE(json("DELETE", `/invoices/${id}`), ctx(String(id)))).status).toBe(404);
    expect((await itemRoute.PUT(json("PUT", `/invoices/${id}`, body()), ctx(String(id)))).status).toBe(404);
  });

  it("PDF devuelve application/pdf", async () => {
    const { id } = await createOne();
    const res = await pdfRoute.GET(json("GET", `/invoices/${id}/pdf`), ctx(String(id)));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("FAC-");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    expect((await pdfRoute.GET(json("GET", "/invoices/99/pdf"), ctx("99"))).status).toBe(404);
  });
});

describe("stats routes", () => {
  it("summary y monthly", async () => {
    await createOne({ status: "SENT" });
    const summary = (await (await summaryRoute.GET(json("GET", "/stats/summary"))).json()).data;
    expect(summary.totalCount).toBe(1);
    expect(summary.byStatus.SENT.count).toBe(1);

    const monthly = await (await monthlyRoute.GET(json("GET", "/stats/monthly?months=3"))).json();
    expect(monthly.data).toHaveLength(3);
    expect(monthly.meta).toEqual({ months: 3 });
    expect((await monthlyRoute.GET(json("GET", "/stats/monthly?months=0"))).status).toBe(400);
  });
});

describe("autenticación y autorización", () => {
  const routes: [string, () => Promise<Response>][] = [
    ["GET /invoices", () => listRoute.GET(json("GET", "/invoices"))],
    ["POST /invoices", () => listRoute.POST(json("POST", "/invoices", body()))],
    ["GET /invoices/:id", () => itemRoute.GET(json("GET", "/invoices/1"), ctx("1"))],
    ["PUT /invoices/:id", () => itemRoute.PUT(json("PUT", "/invoices/1", body()), ctx("1"))],
    ["DELETE /invoices/:id", () => itemRoute.DELETE(json("DELETE", "/invoices/1"), ctx("1"))],
    ["PATCH /invoices/:id/status", () => statusRoute.PATCH(json("PATCH", "/invoices/1/status", { status: "PAID" }), ctx("1"))],
    ["GET /invoices/:id/pdf", () => pdfRoute.GET(json("GET", "/invoices/1/pdf"), ctx("1"))],
    ["GET /stats/summary", () => summaryRoute.GET(json("GET", "/stats/summary"))],
    ["GET /stats/monthly", () => monthlyRoute.GET(json("GET", "/stats/monthly"))],
    ["GET /auth/me", () => meRoute.GET(json("GET", "/auth/me"))],
    ["POST /auth/password", () => passwordRoute.POST(json("POST", "/auth/password", { currentPassword: "x", newPassword: "y".repeat(12) }))],
  ];

  it.each(routes)("%s sin token -> 401 UNAUTHENTICATED", async (_name, call) => {
    bearer = "";
    const res = await call();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("un token inventado, la cookie vieja `session` y esquemas distintos de Bearer -> 401", async () => {
    bearer = "not-a-real-token";
    expect((await listRoute.GET(json("GET", "/invoices"))).status).toBe(401);
    const real = (await signUp("zoe@example.com")).token;
    bearer = "";
    const badHeaders: Record<string, string>[] = [
      { Authorization: `Basic ${real}` },
      { Authorization: real },
      { Authorization: `Bearer ${real} extra` },
      { Authorization: "Bearer" },
      { Cookie: `session=${real}` },
      { Cookie: `refresh=${real}` },
    ];
    for (const headers of badHeaders) {
      expect((await listRoute.GET(json("GET", "/invoices", undefined, headers))).status).toBe(401);
    }
    // the scheme name is case-insensitive
    expect((await listRoute.GET(json("GET", "/invoices", undefined, { Authorization: `bearer ${real}` }))).status).toBe(200);
  });

  it("un access token con alg=none, firma ajena, caducado o de otra audiencia -> 401", async () => {
    const real = (await signUp("zoe@example.com")).token;
    const [, payload] = real.split(".");
    const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "at+jwt" })).toString("base64url")}.${payload}.`;
    const config = loadJwtConfig({ JWT_SECRET: "x".repeat(40) });
    const foreign = await signAccessToken(config, { userId: 1, role: "ADMIN", version: 0 }, "j", new Date());
    const expired = await signAccessToken(
      loadJwtConfig({ JWT_SECRET: process.env.JWT_SECRET }),
      { userId: 1, role: "USER", version: 0 },
      "j",
      new Date(Date.now() - 3_600_000),
    );
    const otherAudience = await signAccessToken(
      loadJwtConfig({ JWT_SECRET: process.env.JWT_SECRET, JWT_AUDIENCE: "other" }),
      { userId: 1, role: "USER", version: 0 },
      "j",
      new Date(),
    );
    for (const token of [none, foreign, expired, otherAudience]) {
      bearer = token;
      expect((await meRoute.GET(json("GET", "/auth/me"))).status).toBe(401);
    }
  });

  it("login correcto: access token en el cuerpo y refresh en cookie httpOnly acotada a /api/v1/auth", async () => {
    const res = await loginRoute.POST(
      new Request(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: " ANA@example.com ", password: PASSWORD }),
      }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("Set-Cookie")!;
    expect(setCookie).toMatch(/^refresh=[\w-]+\.[\w-]+\.[\w-]+;/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    expect(setCookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(setCookie).toMatch(/Max-Age=604800/);
    expect(setCookie).not.toMatch(/^session=/);
    const { data } = await res.json();
    expect(data).toEqual({ token: expect.any(String), user: { id: expect.any(Number), email: "ana@example.com", role: "USER" } });
    expect(JSON.stringify(data)).not.toMatch(/hash|scrypt|refresh/i);
    expect(Object.keys(decodeJwt(data.token)).sort()).toEqual(["aud", "exp", "iat", "iss", "jti", "role", "sub", "ver"]);
  });

  it("login: mismo 401 y mensaje para email desconocido y contraseña incorrecta", async () => {
    const attempt = async (email: string, password: string) => {
      const res = await loginRoute.POST(
        new Request(`${BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }),
      );
      return { status: res.status, body: await res.json(), setCookie: res.headers.get("Set-Cookie") };
    };
    const wrongPassword = await attempt("ana@example.com", "wrong password!!");
    const unknownUser = await attempt("nadie@example.com", PASSWORD);
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword).toEqual(unknownUser);
    expect(wrongPassword.setCookie).toBeNull();
  });

  it("login valida el cuerpo y el Content-Type -> 400", async () => {
    const post = (headers: Record<string, string>, payload: unknown) =>
      loginRoute.POST(new Request(`${BASE}/auth/login`, { method: "POST", headers, body: JSON.stringify(payload) }));
    expect((await post({ "Content-Type": "application/json" }, { email: "no-email", password: "x" })).status).toBe(400);
    expect((await post({ "Content-Type": "application/json" }, { email: "ana@example.com" })).status).toBe(400);
    expect((await post({ "Content-Type": "text/plain" }, { email: "ana@example.com", password: PASSWORD })).status).toBe(400);
  });

  it("me devuelve id, email y rol del token, nada más", async () => {
    expect((await (await meRoute.GET(json("GET", "/auth/me"))).json()).data).toEqual({
      id: expect.any(Number),
      email: "ana@example.com",
      role: "USER",
    });
  });

  describe("refresh y logout", () => {
    it("refresh rota la cookie y devuelve un access token nuevo con el mismo formato que el login", async () => {
      const { refresh, token } = await loginAs("ana@example.com");
      const res = await postRefresh(refresh);
      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data).toEqual({ token: expect.any(String), user: { id: expect.any(Number), email: "ana@example.com", role: "USER" } });
      expect(data.token).not.toBe(token);
      const setCookie = res.headers.get("Set-Cookie")!;
      expect(setCookie).toMatch(/^refresh=/);
      expect(refreshCookieOf(res)).not.toBe(refresh);
      expect(setCookie).toMatch(/HttpOnly; SameSite=Strict/);
      bearer = data.token;
      expect((await meRoute.GET(json("GET", "/auth/me"))).status).toBe(200);
    });

    it("refresh sin cookie, con basura o con un access token -> 401 genérico y borra la cookie", async () => {
      const { token } = await loginAs("ana@example.com");
      const bodies = new Set<string>();
      for (const cookie of [undefined, "refresh=junk", `refresh=${token}`]) {
        const res = await postRefresh(cookie);
        expect(res.status).toBe(401);
        expect(res.headers.get("Set-Cookie")).toMatch(/^refresh=; Max-Age=0; Path=\/api\/v1\/auth/);
        bodies.add(JSON.stringify(await res.json()));
      }
      expect(bodies.size).toBe(1);
    });

    it("un refresh token reutilizado fuera de la ventana de gracia -> 401 y la familia entera queda revocada", async () => {
      const { refresh } = await loginAs("ana@example.com");
      const next = refreshCookieOf(await postRefresh(refresh));
      (fake.auth as FakeAuthRepository).refreshTokens.find((t) => t.replacedBy !== null)!.revokedAt = new Date(Date.now() - 60_000);
      const replay = await postRefresh(refresh);
      expect(replay.status).toBe(401);
      expect(replay.headers.get("Set-Cookie")).toMatch(/^refresh=; Max-Age=0;/);
      expect((await postRefresh(next)).status).toBe(401);
    });

    it("un refresh token reutilizado dentro de la ventana de gracia -> 401 sin borrar la cookie ni revocar la familia", async () => {
      const { refresh } = await loginAs("ana@example.com");
      const next = refreshCookieOf(await postRefresh(refresh));
      const replay = await postRefresh(refresh);
      expect(replay.status).toBe(401);
      expect(replay.headers.get("Set-Cookie")).toBeNull();
      expect((await postRefresh(next)).status).toBe(200);
    });

    it("el refresh token no vale como Bearer en las rutas de datos", async () => {
      const { refresh } = await loginAs("ana@example.com");
      bearer = refresh.slice("refresh=".length);
      expect((await listRoute.GET(json("GET", "/invoices"))).status).toBe(401);
    });

    it("logout revoca la familia, limpia la cookie y es idempotente", async () => {
      const { refresh } = await loginAs("ana@example.com");
      const res = await logoutRoute.POST(json("POST", "/auth/logout", undefined, { Cookie: refresh }));
      expect(res.status).toBe(204);
      expect(res.headers.get("Set-Cookie")).toMatch(/^refresh=; Max-Age=0; Path=\/api\/v1\/auth;/);
      expect((await postRefresh(refresh)).status).toBe(401);
      expect((await logoutRoute.POST(json("POST", "/auth/logout", undefined, { Cookie: refresh }))).status).toBe(204);
      expect((await logoutRoute.POST(json("POST", "/auth/logout"))).status).toBe(204);
    });

    it("logout de una sesión no cierra la de otro usuario", async () => {
      const ana = await loginAs("ana@example.com");
      const bea = await signUp("bea@example.com");
      await logoutRoute.POST(json("POST", "/auth/logout", undefined, { Cookie: ana.refresh }));
      expect((await postRefresh(bea.refresh)).status).toBe(200);
    });
  });

  describe("RBAC", () => {
    const adminOnly = () =>
      container.withRole("ADMIN")(async (user, _request: Request) => Response.json({ data: { id: user.id } }));
    const eitherRole = () => container.withRole("USER", "ADMIN")(async (_user, _request: Request) => new Response(null, { status: 204 }));

    it("sin token -> 401; con rol insuficiente -> 403 FORBIDDEN; con el rol -> pasa", async () => {
      bearer = "";
      expect((await adminOnly()(json("GET", "/x"))).status).toBe(401);

      bearer = (await loginAs("ana@example.com")).token;
      const denied = await adminOnly()(json("GET", "/x"));
      expect(denied.status).toBe(403);
      expect((await denied.json()).error.code).toBe("FORBIDDEN");
      expect((await eitherRole()(json("GET", "/x"))).status).toBe(204);

      bearer = (await signUp("root@example.com", "ADMIN")).token;
      expect((await adminOnly()(json("GET", "/x"))).status).toBe(200);
    });

    it("el rol sale de la base de datos: degradar a un admin surte efecto con su token vivo", async () => {
      bearer = (await signUp("root@example.com", "ADMIN")).token;
      expect((await adminOnly()(json("GET", "/x"))).status).toBe(200);
      (fake.auth as FakeAuthRepository).users.find((u) => u.email === "root@example.com")!.role = "USER";
      expect((await adminOnly()(json("GET", "/x"))).status).toBe(403);
    });

    it("un ADMIN sigue sin ver las facturas de otros: el aislamiento por dueño no depende del rol", async () => {
      const { id } = await createOne({ clientName: "De Ana" });
      bearer = (await signUp("root@example.com", "ADMIN")).token;
      expect((await itemRoute.GET(json("GET", `/invoices/${id}`), ctx(String(id)))).status).toBe(404);
      expect((await (await listRoute.GET(json("GET", "/invoices"))).json()).meta.total).toBe(0);
    });
  });

  describe("aislamiento entre usuarios", () => {
    let anaToken: string;
    let beaToken: string;
    let id: number;

    beforeEach(async () => {
      anaToken = bearer;
      beaToken = (await signUp("bea@example.com")).token;
      bearer = anaToken;
      id = (await createOne({ clientName: "De Ana" })).id;
      bearer = beaToken;
    });

    it("Bea no ve, lee, edita, cambia el estado, descarga ni borra la factura de Ana: 404 uniforme", async () => {
      const own = await itemRoute.GET(json("GET", "/invoices/9999"), ctx("9999"));
      const calls = [
        itemRoute.GET(json("GET", `/invoices/${id}`), ctx(String(id))),
        itemRoute.PUT(json("PUT", `/invoices/${id}`, body({ clientName: "Hackeada" })), ctx(String(id))),
        statusRoute.PATCH(json("PATCH", `/invoices/${id}/status`, { status: "PAID" }), ctx(String(id))),
        pdfRoute.GET(json("GET", `/invoices/${id}/pdf`), ctx(String(id))),
        itemRoute.DELETE(json("DELETE", `/invoices/${id}`), ctx(String(id))),
      ];
      for (const res of await Promise.all(calls)) {
        expect(res.status).toBe(404);
        // Indistinguishable from an id that never existed
        expect((await res.json()).error.code).toBe("NOT_FOUND");
      }
      expect(own.status).toBe(404);

      bearer = anaToken;
      const intact = (await (await itemRoute.GET(json("GET", `/invoices/${id}`), ctx(String(id)))).json()).data;
      expect(intact).toMatchObject({ clientName: "De Ana", status: "DRAFT" });
    });

    it("el listado y las estadísticas de Bea no incluyen datos de Ana", async () => {
      expect((await (await listRoute.GET(json("GET", "/invoices"))).json()).meta.total).toBe(0);
      const summary = (await (await summaryRoute.GET(json("GET", "/stats/summary"))).json()).data;
      expect(summary.totalCount).toBe(0);
      const monthly = (await (await monthlyRoute.GET(json("GET", "/stats/monthly"))).json()).data;
      expect(monthly.every((m: { totalsCents: Record<string, number> }) => Object.values(m.totalsCents).every((v) => v === 0))).toBe(true);
    });

    it("lo que Bea crea es suyo y Ana no lo ve", async () => {
      const mine = await createOne({ clientName: "De Bea" });
      bearer = anaToken;
      expect((await itemRoute.GET(json("GET", `/invoices/${mine.id}`), ctx(String(mine.id)))).status).toBe(404);
      expect((await (await listRoute.GET(json("GET", "/invoices"))).json()).meta.total).toBe(1);
    });

    it("el token de una no sirve como el de la otra, aunque se cambie el sub a mano", async () => {
      const [header, , signature] = beaToken.split(".");
      const payload = Buffer.from(JSON.stringify({ ...decodeJwt(beaToken), sub: String(decodeJwt(anaToken).sub) })).toString("base64url");
      bearer = `${header}.${payload}.${signature}`;
      expect((await listRoute.GET(json("GET", "/invoices"))).status).toBe(401);
    });
  });
});

describe("bloqueo y cambio de contraseña (HTTP)", () => {
  const login = (email: string, password: string) =>
    loginRoute.POST(
      new Request(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );
  const NEW = "a brand new passphrase";

  it("cinco intentos fallidos bloquean la cuenta; la contraseña correcta deja de valer", async () => {
    for (let i = 0; i < 5; i++) expect((await login("ana@example.com", "wrong password!!")).status).toBe(401);
    const res = await login("ana@example.com", PASSWORD);
    expect(res.status).toBe(401);
    expect(res.headers.get("Set-Cookie")).toBeNull();
    expect((await res.json()).error.message).toMatch(/5 intentos fallidos/);
  });

  it("el bloqueo corta también los tokens vivos de esa cuenta", async () => {
    const { token, refresh } = await loginAs("ana@example.com");
    for (let i = 0; i < 5; i++) await login("ana@example.com", "wrong password!!");
    bearer = token;
    expect((await meRoute.GET(json("GET", "/auth/me"))).status).toBe(401);
    expect((await postRefresh(refresh)).status).toBe(401);
  });

  it("cambiar la contraseña: 204; el access token vivo muere, el refresh del que cambia renueva, la antigua no sirve", async () => {
    const { token, refresh } = await loginAs("ana@example.com");
    bearer = token;
    const res = await passwordRoute.POST(json("POST", "/auth/password", { currentPassword: PASSWORD, newPassword: NEW }, { Cookie: refresh }));
    expect(res.status).toBe(204);
    expect((await meRoute.GET(json("GET", "/auth/me"))).status).toBe(401);
    const renewed = await postRefresh(refresh);
    expect(renewed.status).toBe(200);
    bearer = (await renewed.json()).data.token;
    expect((await meRoute.GET(json("GET", "/auth/me"))).status).toBe(200);
    expect((await login("ana@example.com", PASSWORD)).status).toBe(401);
    expect((await login("ana@example.com", NEW)).status).toBe(200);
  });

  it("revoca los refresh tokens de los demás dispositivos", async () => {
    const mine = await loginAs("ana@example.com");
    const other = await loginAs("ana@example.com");
    bearer = mine.token;
    await passwordRoute.POST(json("POST", "/auth/password", { currentPassword: PASSWORD, newPassword: NEW }, { Cookie: mine.refresh }));
    expect((await postRefresh(other.refresh)).status).toBe(401);
    expect((await postRefresh(mine.refresh)).status).toBe(200);
  });

  it("contraseña actual incorrecta -> 422 con error en currentPassword; nueva corta -> 400", async () => {
    const wrong = await passwordRoute.POST(json("POST", "/auth/password", { currentPassword: "nope", newPassword: NEW }));
    expect(wrong.status).toBe(422);
    expect((await wrong.json()).error.details[0].field).toBe("currentPassword");
    const short = await passwordRoute.POST(json("POST", "/auth/password", { currentPassword: PASSWORD, newPassword: "short" }));
    expect(short.status).toBe(400);
  });
});

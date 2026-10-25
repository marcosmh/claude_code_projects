import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FakeAuthRepository } from "./helpers/FakeAuthRepository";
import type { FakeInvoiceRepository } from "./helpers/FakeInvoiceRepository";

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
import { container } from "@/container";
import * as listRoute from "@/app/api/v1/invoices/route";
import * as itemRoute from "@/app/api/v1/invoices/[id]/route";
import * as statusRoute from "@/app/api/v1/invoices/[id]/status/route";
import * as pdfRoute from "@/app/api/v1/invoices/[id]/pdf/route";
import * as summaryRoute from "@/app/api/v1/stats/summary/route";
import * as monthlyRoute from "@/app/api/v1/stats/monthly/route";

const BASE = "http://localhost:4000/api/v1";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
// Session cookie of the signed-in test user; "" sends no cookie. Set in beforeEach / by tests.
let cookie = "";
const json = (method: string, url: string, body?: unknown) =>
  new Request(`${BASE}${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
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
const sessionCookieOf = (res: Response) => res.headers.get("Set-Cookie")!.split(";")[0];

async function signUp(email: string): Promise<string> {
  await container.authService.createUser(email, PASSWORD);
  const res = await loginRoute.POST(
    new Request(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD }),
    }),
  );
  return sessionCookieOf(res);
}

beforeEach(async () => {
  const repo = fake.repo as FakeInvoiceRepository;
  const auth = fake.auth as FakeAuthRepository;
  repo.rows.clear();
  repo.owners.clear();
  auth.users.length = 0;
  auth.sessions.clear();
  cookie = await signUp("ana@example.com");
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
        headers: { ...(contentType ? { "Content-Type": contentType } : {}), Cookie: cookie },
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
      headers: { "Content-Type": "application/json; charset=utf-8", Cookie: cookie },
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
  ];

  it.each(routes)("%s sin sesión -> 401 UNAUTHENTICATED", async (_name, call) => {
    cookie = "";
    const res = await call();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("una cookie inventada -> 401", async () => {
    cookie = "session=not-a-real-token";
    expect((await listRoute.GET(json("GET", "/invoices"))).status).toBe(401);
  });

  it("login correcto: cookie httpOnly y usuario sin hash", async () => {
    const res = await loginRoute.POST(
      new Request(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: " ANA@example.com ", password: PASSWORD }),
      }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("Set-Cookie")!;
    expect(setCookie).toMatch(/^session=[\w-]{43};/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Max-Age=604800/);
    expect((await res.json()).data).toEqual({ id: expect.any(Number), email: "ana@example.com" });
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

  it("me devuelve el usuario de la sesión", async () => {
    expect((await (await meRoute.GET(json("GET", "/auth/me"))).json()).data.email).toBe("ana@example.com");
  });

  it("logout invalida la sesión y limpia la cookie; es idempotente", async () => {
    const res = await logoutRoute.POST(json("POST", "/auth/logout"));
    expect(res.status).toBe(204);
    expect(res.headers.get("Set-Cookie")).toMatch(/^session=; Max-Age=0;/);
    expect((await meRoute.GET(json("GET", "/auth/me"))).status).toBe(401);
    expect((await logoutRoute.POST(json("POST", "/auth/logout"))).status).toBe(204);
    cookie = "";
    expect((await logoutRoute.POST(json("POST", "/auth/logout"))).status).toBe(204);
  });

  describe("aislamiento entre usuarios", () => {
    let anaCookie: string;
    let beaCookie: string;
    let id: number;

    beforeEach(async () => {
      anaCookie = cookie;
      beaCookie = await signUp("bea@example.com");
      cookie = anaCookie;
      id = (await createOne({ clientName: "De Ana" })).id;
      cookie = beaCookie;
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

      cookie = anaCookie;
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
      cookie = anaCookie;
      expect((await itemRoute.GET(json("GET", `/invoices/${mine.id}`), ctx(String(mine.id)))).status).toBe(404);
      expect((await (await listRoute.GET(json("GET", "/invoices"))).json()).meta.total).toBe(1);
    });

    it("cerrar la sesión de una no afecta a la otra", async () => {
      await logoutRoute.POST(json("POST", "/auth/logout"));
      cookie = anaCookie;
      expect((await meRoute.GET(json("GET", "/auth/me"))).status).toBe(200);
    });
  });
});

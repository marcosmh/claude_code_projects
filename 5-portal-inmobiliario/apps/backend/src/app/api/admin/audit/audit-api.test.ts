import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as register } from "@/app/api/auth/register/route";
import { PUT as putSettings } from "@/app/api/admin/settings/route";
import { sessionCookieName } from "@/lib/auth/session";
import type { AuditLogDto, PaginatedResponse } from "@portal/shared-types";
import { GET as listAudit } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const emailPrefix = `audit-test-${Date.now()}`;
const password = "clave-segura-1";

describe.skipIf(!databaseUrl)("API REST del registro de auditoría", () => {
  let client: PrismaClient;
  let counter = 0;

  const jsonRequest = (path: string, ip: string, body: unknown, token?: string, method = "POST") =>
    new NextRequest(`http://localhost${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
        ...(token ? { cookie: `${sessionCookieName}=${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  const nextIp = () => `10.4.0.${++counter}`;
  const tokenOf = (response: Response) =>
    /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1] as string;

  async function createAccount(role: "USER" | "ADMIN") {
    const email = `${emailPrefix}-${++counter}@example.com`;
    const response = await register(
      jsonRequest("/api/auth/register", nextIp(), { name: "Prueba Auditoría", email, password }),
    );
    const { id } = (await response.json()) as { id: string };
    await client.user.update({ where: { id }, data: { role } });
    return { id, email, token: tokenOf(response) };
  }

  const call = (token?: string, query = "") =>
    listAudit(
      new NextRequest(`http://localhost/api/admin/audit${query}`, {
        headers: token ? { cookie: `${sessionCookieName}=${token}` } : {},
      }),
      { params: Promise.resolve({}) },
    );
  const entriesFor = async (token: string, search: string, extra = "") => {
    const response = await call(token, `?search=${encodeURIComponent(search)}${extra}`);
    return (await response.json()) as PaginatedResponse<AuditLogDto>;
  };

  beforeAll(() => {
    vi.stubEnv("AUTH_SECRET", "t".repeat(48));
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
  });

  afterAll(async () => {
    await client.auditLog.deleteMany({ where: { actorEmail: { startsWith: emailPrefix } } });
    await client.user.deleteMany({ where: { email: { startsWith: emailPrefix } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("responde 401 sin sesión, 403 a un USER y 400 con parámetros inválidos", async () => {
    expect((await call()).status).toBe(401);
    expect((await call((await createAccount("USER")).token)).status).toBe(403);

    const admin = await createAccount("ADMIN");
    for (const query of ["?category=otra", "?from=hoy", "?from=2026-11-12&to=2026-11-01"]) {
      expect((await call(admin.token, query)).status).toBe(400);
    }
  });

  it("registra el registro, el inicio y el cierre de sesión y los fallidos", async () => {
    const admin = await createAccount("ADMIN");
    const loginResponse = await login(
      jsonRequest("/api/auth/login", nextIp(), { email: admin.email, password }),
    );
    await login(
      jsonRequest("/api/auth/login", nextIp(), { email: admin.email, password: "incorrecta-1" }),
    );
    await logout(jsonRequest("/api/auth/logout", nextIp(), {}, tokenOf(loginResponse)));

    const { items } = await entriesFor(admin.token, admin.email);
    const actions = items.map((entry) => entry.action);

    expect(actions).toEqual(
      expect.arrayContaining(["REGISTER", "LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT"]),
    );
    expect(items.find((entry) => entry.action === "LOGIN_FAILED")).toMatchObject({
      actorId: null,
      actorEmail: admin.email,
      category: "auth",
    });
    expect(items.find((entry) => entry.action === "LOGIN_SUCCESS")?.ipAddress).toMatch(/^10\.4\./);
  });

  it("registra el bloqueo tras 5 intentos fallidos una sola vez", async () => {
    const admin = await createAccount("ADMIN");
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await login(
        jsonRequest("/api/auth/login", nextIp(), { email: admin.email, password: "incorrecta-1" }),
      );
    }
    const { items } = await entriesFor(admin.token, admin.email);
    expect(items.filter((entry) => entry.action === "LOGIN_FAILED")).toHaveLength(5);
    expect(items.filter((entry) => entry.action === "LOGIN_LOCKED")).toHaveLength(1);
  });

  it("audita una acción de administración con su responsable, sin guardar el cuerpo", async () => {
    const admin = await createAccount("ADMIN");
    const current = await client.systemSettings.findUnique({ where: { id: "global" } });
    const response = await putSettings(
      jsonRequest(
        "/api/admin/settings",
        nextIp(),
        {
          allowRegistration: true,
          defaultCurrency: current?.defaultCurrency ?? "MXN",
          contactEmail: current?.contactEmail ?? "",
          contactPhone: current?.contactPhone ?? "",
        },
        admin.token,
        "PUT",
      ),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(200);

    const { items } = await entriesFor(admin.token, admin.email, "&category=settings");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      action: "SETTINGS_UPDATED",
      actorId: admin.id,
      actorEmail: admin.email,
      entityType: "settings",
    });
    expect(JSON.stringify(items[0])).not.toContain(password);
  });

  it("no audita una escritura rechazada ni las lecturas", async () => {
    const admin = await createAccount("ADMIN");
    const rejected = await putSettings(
      jsonRequest("/api/admin/settings", nextIp(), { defaultCurrency: "EUR" }, admin.token, "PUT"),
      { params: Promise.resolve({}) },
    );
    expect(rejected.status).toBe(400);
    await call(admin.token);

    const { items } = await entriesFor(admin.token, admin.email);
    expect(items.map((entry) => entry.action)).toEqual(["REGISTER"]);
  });

  it("filtra por categoría y fechas, y ordena del más reciente al más antiguo", async () => {
    const admin = await createAccount("ADMIN");
    await login(jsonRequest("/api/auth/login", nextIp(), { email: admin.email, password }));

    const today = new Date().toISOString().slice(0, 10);
    const all = await entriesFor(admin.token, admin.email, `&from=${today}&to=${today}`);
    expect(all.total).toBe(2);
    expect(all.items[0].action).toBe("LOGIN_SUCCESS");
    expect(all.items[1].action).toBe("REGISTER");

    const onlySettings = await entriesFor(admin.token, admin.email, "&category=settings");
    expect(onlySettings.total).toBe(0);
    const past = await entriesFor(admin.token, admin.email, "&to=2020-01-01");
    expect(past.total).toBe(0);
  });
});

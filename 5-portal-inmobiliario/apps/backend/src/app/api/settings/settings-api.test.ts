import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { PUT as putSettings, GET as getAdminSettings } from "@/app/api/admin/settings/route";
import { sessionCookieName } from "@/lib/auth/session";
import type { SystemSettingsDto } from "@portal/shared-types";
import { GET as getPublicSettings } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const emailPrefix = `settings-test-${Date.now()}`;

describe.skipIf(!databaseUrl)("API REST de configuración del sistema", () => {
  let client: PrismaClient;
  let counter = 0;
  let original: SystemSettingsDto | null = null;

  async function createSession(role: "USER" | "ADMIN") {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `10.3.0.${++counter}`,
        },
        body: JSON.stringify({
          name: "Prueba Ajustes",
          email: `${emailPrefix}-${counter}@example.com`,
          password: "clave-segura-1",
        }),
      }),
    );
    const { id } = (await response.json()) as { id: string };
    await client.user.update({ where: { id }, data: { role } });
    return /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1] as string;
  }

  const adminRequest = (token?: string, body?: unknown) =>
    new NextRequest("http://localhost/api/admin/settings", {
      method: body === undefined ? "GET" : "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { cookie: `${sessionCookieName}=${token}` } : {}),
      },
      ...(body === undefined
        ? {}
        : { body: typeof body === "string" ? body : JSON.stringify(body) }),
    });
  const context = { params: Promise.resolve({}) };

  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "t".repeat(48));
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    original = (await (await getPublicSettings()).json()) as SystemSettingsDto;
  });

  afterAll(async () => {
    // Los demás archivos de prueba dependen de que el registro siga abierto: se restaura todo.
    if (original) {
      await client.systemSettings.update({ where: { id: "global" }, data: original });
    }
    await client.user.deleteMany({ where: { email: { startsWith: emailPrefix } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("GET /api/settings es público y devuelve solo los ajustes públicos", async () => {
    const response = await getPublicSettings();
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(Object.keys(body).sort()).toEqual([
      "allowRegistration",
      "contactEmail",
      "contactPhone",
      "defaultCurrency",
    ]);
  });

  it("GET y PUT /api/admin/settings responden 401 sin sesión y 403 a un USER", async () => {
    const user = await createSession("USER");
    for (const token of [undefined, user]) {
      const expected = token ? 403 : 401;
      expect((await getAdminSettings(adminRequest(token), context)).status).toBe(expected);
      expect((await putSettings(adminRequest(token, original), context)).status).toBe(expected);
    }
  });

  it("un ADMIN guarda la configuración y el cambio se ve en la ruta pública", async () => {
    const token = await createSession("ADMIN");
    const next = {
      allowRegistration: true,
      defaultCurrency: "USD",
      contactEmail: "  contacto@portal.mx ",
      contactPhone: "",
    };

    const saved = await putSettings(adminRequest(token, next), context);
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({
      allowRegistration: true,
      defaultCurrency: "USD",
      contactEmail: "contacto@portal.mx",
      contactPhone: null,
    });

    const adminView = (await (
      await getAdminSettings(adminRequest(token), context)
    ).json()) as SystemSettingsDto;
    const publicView = (await (await getPublicSettings()).json()) as SystemSettingsDto;
    expect(adminView).toEqual(publicView);
    expect(publicView.defaultCurrency).toBe("USD");
  });

  it("responde 400 con datos inválidos o JSON roto y no cambia nada", async () => {
    const token = await createSession("ADMIN");
    const before = await (await getPublicSettings()).json();

    for (const body of [
      { ...original, contactEmail: "no-es-email" },
      { ...original, defaultCurrency: "EUR" },
      { ...original, contactPhone: "abc" },
      "{no-json",
    ]) {
      expect((await putSettings(adminRequest(token, body), context)).status).toBe(400);
    }
    expect(await (await getPublicSettings()).json()).toEqual(before);
  });
});

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";
import { GET as getDashboard } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const emailPrefix = `dashboard-test-${Date.now()}`;

describe.skipIf(!databaseUrl)("API REST del panel de administración", () => {
  let client: PrismaClient;
  let counter = 0;

  async function createSession(role: "USER" | "ADMIN") {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Prueba Dashboard",
          email: `${emailPrefix}-${++counter}@example.com`,
          password: "clave-segura-1",
        }),
      }),
    );
    const { id } = (await response.json()) as { id: string };
    await client.user.update({ where: { id }, data: { role } });
    return /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1] as string;
  }

  const call = (token?: string) =>
    getDashboard(
      new NextRequest("http://localhost/api/admin/dashboard", {
        headers: token ? { cookie: `${sessionCookieName}=${token}` } : {},
      }),
      { params: Promise.resolve({}) },
    );

  beforeAll(() => {
    vi.stubEnv("AUTH_SECRET", "t".repeat(48));
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
  });

  afterAll(async () => {
    await client.user.deleteMany({ where: { email: { startsWith: emailPrefix } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("responde 401 sin sesión y 403 a un USER", async () => {
    expect((await call()).status).toBe(401);
    expect((await call(await createSession("USER"))).status).toBe(403);
  });

  it("un ADMIN recibe los indicadores reales", async () => {
    const response = await call(await createSession("ADMIN"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const indicators = (await response.json()) as Record<string, number>;
    expect(indicators.users).toBe(await client.user.count());
    expect(indicators.inquiries).toBe(await client.inquiry.count());
    expect(indicators.totalProperties).toBe(await client.property.count());
    expect(indicators.publishedProperties).toBe(
      await client.property.count({ where: { isPublished: true } }),
    );
    expect(indicators.propertiesForSale + indicators.propertiesForRent).toBeLessThanOrEqual(
      indicators.publishedProperties,
    );
  });
});

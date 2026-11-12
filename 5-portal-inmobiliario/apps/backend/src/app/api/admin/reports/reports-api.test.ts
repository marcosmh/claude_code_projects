import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";
import type { AdminReportsDto } from "@portal/shared-types";
import { GET as getReports } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const emailPrefix = `reports-test-${Date.now()}`;

describe.skipIf(!databaseUrl)("API REST de reportes y estadísticas", () => {
  let client: PrismaClient;
  let counter = 0;

  async function createSession(role: "USER" | "ADMIN") {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `10.2.0.${++counter}`,
        },
        body: JSON.stringify({
          name: "Prueba Reportes",
          email: `${emailPrefix}-${counter}@example.com`,
          password: "clave-segura-1",
        }),
      }),
    );
    const { id } = (await response.json()) as { id: string };
    await client.user.update({ where: { id }, data: { role } });
    return /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1] as string;
  }

  const call = (token?: string) =>
    getReports(
      new NextRequest("http://localhost/api/admin/reports", {
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

  it("un ADMIN recibe los reportes, coherentes con la base de datos", async () => {
    const token = await createSession("ADMIN");
    const first = await call(token);
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("no-store");

    const sum = (entries: { count: number }[]) =>
      entries.reduce((total, entry) => total + entry.count, 0);

    // Otras suites crean y borran datos en paralelo: se reintenta hasta tomar una foto estable.
    await vi.waitFor(
      async () => {
        const reports = (await (await call(token)).json()) as AdminReportsDto;
        const [properties, users, inquiries, favorites] = await Promise.all([
          client.property.count({ where: { deletedAt: null } }),
          client.user.count(),
          client.inquiry.count({ where: { property: { deletedAt: null } } }),
          client.favorite.count({ where: { property: { deletedAt: null } } }),
        ]);

        expect(sum(reports.properties.byOperation)).toBe(properties);
        expect(sum(reports.properties.byType)).toBe(properties);
        expect(sum(reports.properties.byAvailability)).toBe(properties);
        expect(sum(reports.properties.byVisibility)).toBe(properties);
        expect(reports.users.total).toBe(users);
        expect(reports.inquiries.total).toBe(inquiries);
        expect(reports.favorites.total).toBe(favorites);
      },
      { timeout: 10_000, interval: 250 },
    );

    const reports = (await (await call(token)).json()) as AdminReportsDto;
    expect(reports.users.active + reports.users.inactive).toBe(reports.users.total);
    expect(reports.inquiries.fromUsers + reports.inquiries.fromVisitors).toBe(
      reports.inquiries.total,
    );
    expect(reports.monthly).toHaveLength(6);
    expect(reports.properties.topCities.length).toBeLessThanOrEqual(5);
    expect(reports.inquiries.topProperties.length).toBeLessThanOrEqual(5);
  });
});

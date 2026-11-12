import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";
import { GET } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const runIdentifier = `inquiries-admin-${Date.now()}`;

describe.skipIf(!databaseUrl)("API REST: administración de consultas", () => {
  let client: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let propertyId: string;
  let deletedPropertyId: string;
  let counter = 0;

  async function createSession(role: "USER" | "ADMIN") {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Prueba Consultas",
          email: `${runIdentifier}-${++counter}@example.com`,
          password: "clave-segura-1",
        }),
      }),
    );
    const { id } = (await response.json()) as { id: string };
    await client.user.update({ where: { id }, data: { role } });
    const token = /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
    return { id, token: token as string };
  }

  const list = (token: string | null, query = "") =>
    GET(
      new NextRequest(`http://localhost/api/admin/inquiries?${query}`, {
        headers: token ? { cookie: `${sessionCookieName}=${token}` } : {},
      }),
      { params: Promise.resolve({}) },
    );

  const createProperty = (suffix: string, deletedAt: Date | null = null) =>
    client.property.create({
      data: {
        title: `${runIdentifier} ${suffix}`,
        description: "Propiedad de prueba",
        operation: "SALE",
        type: "HOUSE",
        price: 1000000,
        address: "Calle 1",
        commune: "Centro",
        city: "Puebla",
        region: "Puebla",
        deletedAt,
      },
    });

  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "t".repeat(48));
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    ({ token: adminToken } = await createSession("ADMIN"));
    ({ id: userId, token: userToken } = await createSession("USER"));
    propertyId = (await createProperty("viva")).id;
    deletedPropertyId = (await createProperty("borrada", new Date())).id;
    await client.inquiry.createMany({
      data: [
        {
          propertyId,
          userId,
          name: "Con Cuenta",
          email: "cuenta@example.com",
          phone: "5512345678",
          message: `${runIdentifier} quisiera información sobre la propiedad`,
        },
        {
          propertyId,
          name: "Visitante Ñoño",
          email: "visitante@example.com",
          message: `${runIdentifier} consulta de un visitante sin sesión`,
        },
        {
          propertyId: deletedPropertyId,
          name: "Otra Persona",
          email: "otra@example.com",
          message: `${runIdentifier} sobre una propiedad eliminada`,
        },
      ],
    });
  });

  afterAll(async () => {
    await client.property.deleteMany({ where: { title: { startsWith: runIdentifier } } });
    await client.user.deleteMany({ where: { email: { startsWith: runIdentifier } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("exige sesión (401) y rol ADMIN (403)", async () => {
    expect((await list(null)).status).toBe(401);
    expect((await list(userToken)).status).toBe(403);
  });

  it("lista consultas con propiedad, usuario y contacto, incluso de propiedades eliminadas", async () => {
    const response = await list(adminToken, `search=${runIdentifier}`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      total: number;
      items: {
        name: string;
        userId: string | null;
        userName: string | null;
        propertyDeleted: boolean;
        phone: string | null;
        propertyTitle: string;
      }[];
    };
    expect(body.total).toBe(3);
    const byName = Object.fromEntries(body.items.map((item) => [item.name, item]));
    expect(byName["Con Cuenta"]).toMatchObject({
      userId,
      userName: "Prueba Consultas",
      phone: "5512345678",
      propertyDeleted: false,
    });
    expect(byName["Visitante Ñoño"]).toMatchObject({ userId: null, userName: null, phone: null });
    expect(byName["Otra Persona"]).toMatchObject({ propertyDeleted: true });
  });

  it("filtra por propiedad y busca sin distinguir acentos", async () => {
    const byProperty = (await (await list(adminToken, `propertyId=${propertyId}`)).json()) as {
      total: number;
    };
    expect(byProperty.total).toBe(2);

    const accents = (await (await list(adminToken, "search=visitante%20nono")).json()) as {
      items: { name: string }[];
    };
    expect(accents.items.map((item) => item.name)).toEqual(["Visitante Ñoño"]);
  });

  it("pagina y valida los parámetros", async () => {
    const page = (await (
      await list(adminToken, `search=${runIdentifier}&pageSize=2&page=2`)
    ).json()) as {
      items: unknown[];
      totalPages: number;
    };
    expect(page.items).toHaveLength(1);
    expect(page.totalPages).toBe(2);
    expect((await list(adminToken, "page=0")).status).toBe(400);
  });
});

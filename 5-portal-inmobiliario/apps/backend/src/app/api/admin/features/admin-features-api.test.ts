import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";
import { PUT as setPropertyFeatures } from "../properties/[id]/features/route";
import { GET, POST } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const runIdentifier = `features-api-${Date.now()}`;

describe.skipIf(!databaseUrl)("API REST: administración de características", () => {
  let client: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let propertyId: string;
  let counter = 0;

  async function createSession(role: "USER" | "ADMIN") {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Prueba Características",
          email: `${runIdentifier}-${++counter}@example.com`,
          password: "clave-segura-1",
        }),
      }),
    );
    const { id } = (await response.json()) as { id: string };
    await client.user.update({ where: { id }, data: { role } });
    return /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1] as string;
  }

  const headers = (token: string | null) => ({
    "Content-Type": "application/json",
    ...(token ? { cookie: `${sessionCookieName}=${token}` } : {}),
  });

  const list = (token: string | null) =>
    GET(new NextRequest("http://localhost/api/admin/features", { headers: headers(token) }), {
      params: Promise.resolve({}),
    });
  const create = (token: string | null, body: unknown) =>
    POST(
      new NextRequest("http://localhost/api/admin/features", {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({}) },
    );
  const assign = (id: string, token: string | null, body: unknown) =>
    setPropertyFeatures(
      new NextRequest(`http://localhost/api/admin/properties/${id}/features`, {
        method: "PUT",
        headers: headers(token),
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );

  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "t".repeat(48));
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    adminToken = await createSession("ADMIN");
    userToken = await createSession("USER");
    propertyId = (
      await client.property.create({
        data: {
          title: `${runIdentifier} propiedad`,
          description: "Propiedad de prueba",
          operation: "SALE",
          type: "HOUSE",
          price: 1000000,
          address: "Calle 1",
          commune: "Centro",
          city: "Puebla",
          region: "Puebla",
        },
      })
    ).id;
  });

  afterAll(async () => {
    await client.property.deleteMany({ where: { title: { startsWith: runIdentifier } } });
    await client.feature.deleteMany({ where: { slug: { startsWith: runIdentifier } } });
    await client.user.deleteMany({ where: { email: { startsWith: runIdentifier } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("exige sesión (401) y rol ADMIN (403)", async () => {
    expect((await list(null)).status).toBe(401);
    expect((await list(userToken)).status).toBe(403);
    expect((await create(userToken, { name: "x" })).status).toBe(403);
    expect((await assign(propertyId, userToken, { featureIds: [] })).status).toBe(403);
  });

  it("crea una característica con slug, la lista y rechaza duplicados (409)", async () => {
    const name = `${runIdentifier} Cancha`;
    const response = await create(adminToken, { name });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string; slug: string };
    expect(body.slug).toBe(`${runIdentifier}-cancha`);

    const listed = (await (await list(adminToken)).json()) as { id: string }[];
    expect(listed.some((feature) => feature.id === body.id)).toBe(true);

    expect((await create(adminToken, { name: name.toUpperCase() })).status).toBe(409);
    expect((await create(adminToken, { name: "  " })).status).toBe(400);
  });

  it("asigna, reemplaza y vacía las características de una propiedad", async () => {
    const first = (await (await create(adminToken, { name: `${runIdentifier} A` })).json()) as {
      id: string;
    };
    const second = (await (await create(adminToken, { name: `${runIdentifier} B` })).json()) as {
      id: string;
    };

    const both = await assign(propertyId, adminToken, { featureIds: [first.id, second.id] });
    expect(both.status).toBe(200);
    expect(((await both.json()) as unknown[]).length).toBe(2);

    const only = await assign(propertyId, adminToken, { featureIds: [second.id, second.id] });
    expect(((await only.json()) as { id: string }[]).map((feature) => feature.id)).toEqual([
      second.id,
    ]);
    const stored = await client.property.findUnique({
      where: { id: propertyId },
      include: { features: true },
    });
    expect(stored?.features.map((feature) => feature.id)).toEqual([second.id]);

    expect(
      ((await (await assign(propertyId, adminToken, { featureIds: [] })).json()) as unknown[])
        .length,
    ).toBe(0);
  });

  it("valida ids y propiedad", async () => {
    expect((await assign(propertyId, adminToken, { featureIds: ["no-existe"] })).status).toBe(400);
    expect((await assign(propertyId, adminToken, { featureIds: "x" })).status).toBe(400);
    expect((await assign("no-existe", adminToken, { featureIds: [] })).status).toBe(404);
  });
});

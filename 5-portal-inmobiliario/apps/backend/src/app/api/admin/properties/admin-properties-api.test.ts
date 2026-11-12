import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";
import { GET as listProperties, POST as createProperty } from "./route";
import { GET as getPublicProperty } from "@/app/api/properties/[id]/route";
import { DELETE as deleteProperty, GET as getProperty, PUT as updateProperty } from "./[id]/route";

const databaseUrl = process.env.DATABASE_URL;
const runIdentifier = `admin-props-${Date.now()}`;

const validBody = {
  title: `${runIdentifier} Casa de prueba`,
  description: "Casa de prueba para el CRUD de administración.",
  operation: "SALE",
  type: "HOUSE",
  price: 2500000,
  usableArea: 90,
  totalArea: 120,
  bedrooms: 3,
  address: "Calle de prueba 1",
  commune: "Roma Norte",
  city: "Ciudad de México",
  region: "Ciudad de México",
};

describe.skipIf(!databaseUrl)("API REST de propiedades de administración", () => {
  let client: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let counter = 0;

  async function createSession(role: "USER" | "ADMIN") {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Prueba Admin Propiedades",
          email: `${runIdentifier}-${++counter}@example.com`,
          password: "clave-segura-1",
        }),
      }),
    );
    const { id } = (await response.json()) as { id: string };
    await client.user.update({ where: { id }, data: { role } });
    return /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1] as string;
  }

  const headers = (token: string | null): Record<string, string> => ({
    "Content-Type": "application/json",
    ...(token ? { cookie: `${sessionCookieName}=${token}` } : {}),
  });
  const noParams = { params: Promise.resolve({}) };
  const withId = (id: string) => ({ params: Promise.resolve({ id }) });

  const list = (search = "", token: string | null = adminToken) =>
    listProperties(
      new NextRequest(`http://localhost/api/admin/properties${search}`, {
        headers: headers(token),
      }),
      noParams,
    );
  const create = (body: unknown, token: string | null = adminToken) =>
    createProperty(
      new NextRequest("http://localhost/api/admin/properties", {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(body),
      }),
      noParams,
    );
  const get = (id: string, token: string | null = adminToken) =>
    getProperty(
      new NextRequest(`http://localhost/api/admin/properties/${id}`, { headers: headers(token) }),
      withId(id),
    );
  const update = (id: string, body: unknown, token: string | null = adminToken) =>
    updateProperty(
      new NextRequest(`http://localhost/api/admin/properties/${id}`, {
        method: "PUT",
        headers: headers(token),
        body: JSON.stringify(body),
      }),
      withId(id),
    );
  const remove = (id: string, token: string | null = adminToken) =>
    deleteProperty(
      new NextRequest(`http://localhost/api/admin/properties/${id}`, {
        method: "DELETE",
        headers: headers(token),
      }),
      withId(id),
    );

  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "t".repeat(48));
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    adminToken = await createSession("ADMIN");
    userToken = await createSession("USER");
  });

  afterAll(async () => {
    await client.property.deleteMany({ where: { title: { startsWith: runIdentifier } } });
    await client.user.deleteMany({ where: { email: { startsWith: runIdentifier } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("protege todos los endpoints: 401 sin sesión y 403 para un USER", async () => {
    const created = (await (await create(validBody)).json()) as { id: string };

    for (const token of [null, userToken]) {
      const expected = token ? 403 : 401;
      expect((await list("", token)).status).toBe(expected);
      expect((await create(validBody, token)).status).toBe(expected);
      expect((await get(created.id, token)).status).toBe(expected);
      expect((await update(created.id, validBody, token)).status).toBe(expected);
      expect((await remove(created.id, token)).status).toBe(expected);
    }
    expect(await client.property.count({ where: { id: created.id } })).toBe(1);
  });

  it("crea (201) con valores por defecto y la obtiene aunque no esté publicada", async () => {
    const response = await create(validBody);
    expect(response.status).toBe(201);
    const created = (await response.json()) as Record<string, unknown>;
    expect(created).toMatchObject({
      title: validBody.title,
      price: 2500000,
      currency: "MXN",
      isPublished: false,
      isFeatured: false,
      parkingSpots: null,
    });

    const fetched = await get(created.id as string);
    expect(fetched.status).toBe(200);
    expect(((await fetched.json()) as { id: string }).id).toBe(created.id);
  });

  it("rechaza datos inválidos con 400 y detalles por campo", async () => {
    const response = await create({ ...validBody, price: -5, title: "x" });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { details: { field: string }[] };
    expect(body.details.map((detail) => detail.field).sort()).toEqual(["price", "title"]);
  });

  it("actualiza con PUT y publica; 404 si no existe", async () => {
    const created = (await (await create(validBody)).json()) as { id: string };

    const response = await update(created.id, {
      ...validBody,
      title: `${runIdentifier} Casa editada`,
      price: 3000000,
      bedrooms: null,
      isPublished: true,
      isFeatured: true,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      price: 3000000,
      bedrooms: null,
      isPublished: true,
      isFeatured: true,
    });

    expect((await update("no-existe", validBody)).status).toBe(404);
    expect((await update(created.id, { ...validBody, price: 0 })).status).toBe(400);
  });

  it("lista incluyendo borradores, con búsqueda sin acentos y filtro de estado", async () => {
    const draft = (await (
      await create({ ...validBody, title: `${runIdentifier} Borrador único` })
    ).json()) as { id: string };
    await create({ ...validBody, title: `${runIdentifier} Publicada única`, isPublished: true });

    const all = (await (await list(`?search=${runIdentifier}&pageSize=50`)).json()) as {
      items: { id: string; isPublished: boolean }[];
    };
    expect(all.items.some((item) => item.id === draft.id && !item.isPublished)).toBe(true);

    const drafts = (await (
      await list(`?search=${runIdentifier}&status=draft&pageSize=50`)
    ).json()) as { items: { isPublished: boolean }[] };
    expect(drafts.items.length).toBeGreaterThan(0);
    expect(drafts.items.every((item) => !item.isPublished)).toBe(true);

    const accentless = (await (await list(`?search=BORRADOR%20UNICO`)).json()) as {
      items: { id: string }[];
    };
    expect(accentless.items.map((item) => item.id)).toContain(draft.id);

    expect((await list("?page=0")).status).toBe(400);
    expect((await list("?status=otro")).status).toBe(400);
  });

  it("filtra por operación, tipo, estado, precio y fecha de publicación (Extra O)", async () => {
    const tag = `${runIdentifier} Filtros`;
    const make = async (suffix: string, overrides: Record<string, unknown>) =>
      (
        (await (
          await create({ ...validBody, title: `${tag} ${suffix}`, ...overrides })
        ).json()) as { id: string }
      ).id;
    const soldHouse = await make("casa vendida", {
      operation: "SALE",
      type: "HOUSE",
      price: 5_000_000,
      availability: "SOLD",
    });
    const rentedFlat = await make("depto rentado", {
      operation: "RENT",
      type: "APARTMENT",
      price: 20_000,
      availability: "RENTED",
      isPublished: true,
    });
    await client.property.update({
      where: { id: soldHouse },
      data: { createdAt: new Date("2025-03-15T12:00:00.000Z") },
    });
    await client.property.update({
      where: { id: rentedFlat },
      data: { createdAt: new Date("2025-08-01T12:00:00.000Z") },
    });

    const ids = async (query: string) =>
      (
        (await (await list(`?search=${encodeURIComponent(tag)}&pageSize=50${query}`)).json()) as {
          items: { id: string }[];
        }
      ).items.map((item) => item.id);

    expect(await ids("&operation=SALE")).toEqual([soldHouse]);
    expect(await ids("&type=APARTMENT")).toEqual([rentedFlat]);
    expect(await ids("&availability=SOLD")).toEqual([soldHouse]);
    expect((await ids("&availability=SOLD,RENTED")).sort()).toEqual([soldHouse, rentedFlat].sort());
    expect(await ids("&minPrice=1000000")).toEqual([soldHouse]);
    expect(await ids("&maxPrice=100000")).toEqual([rentedFlat]);
    expect(await ids("&publishedFrom=2025-07-01")).toEqual([rentedFlat]);
    expect(await ids("&publishedTo=2025-03-15")).toEqual([soldHouse]);
    expect(await ids("&status=published&operation=RENT")).toEqual([rentedFlat]);
    expect(await ids("&status=draft&operation=RENT")).toEqual([]);

    expect((await list("?minPrice=10&maxPrice=5")).status).toBe(400);
    expect((await list("?publishedFrom=2026-05-01&publishedTo=2026-04-01")).status).toBe(400);
    expect((await list("?availability=GONE")).status).toBe(400);
  });

  it("elimina de forma lógica (204): conserva la fila, la oculta y luego responde 404", async () => {
    const created = (await (
      await create({ ...validBody, isPublished: true, isFeatured: true })
    ).json()) as {
      id: string;
    };
    const inquiry = await client.inquiry.create({
      data: {
        propertyId: created.id,
        name: "Ana",
        email: "ana@example.com",
        message: "Consulta de una propiedad que se eliminará.",
      },
    });
    const publicDetail = () =>
      getPublicProperty(new NextRequest(`http://localhost/api/properties/${created.id}`), {
        params: Promise.resolve({ id: created.id }),
      });
    expect((await publicDetail()).status).toBe(200);

    expect((await remove(created.id)).status).toBe(204);

    // La fila y sus consultas siguen en la base; solo está marcada y despublicada.
    const row = await client.property.findUnique({ where: { id: created.id } });
    expect(row).toMatchObject({ isPublished: false, isFeatured: false });
    expect(row?.deletedAt).toBeInstanceOf(Date);
    expect(await client.inquiry.count({ where: { id: inquiry.id } })).toBe(1);

    // Para el público y para ADMIN ya no existe.
    expect((await publicDetail()).status).toBe(404);
    expect((await get(created.id)).status).toBe(404);
    expect((await update(created.id, validBody)).status).toBe(404);
    expect((await remove(created.id)).status).toBe(404);
    const listed = (await (await list(`?search=${runIdentifier}&pageSize=50`)).json()) as {
      items: { id: string }[];
    };
    expect(listed.items.map((item) => item.id)).not.toContain(created.id);
  });
});

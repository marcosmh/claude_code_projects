import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";
import { GET as listFavorites } from "./route";
import { DELETE as removeFavorite, PUT as addFavorite } from "./[propertyId]/route";

const databaseUrl = process.env.DATABASE_URL;
const testRunIdentifier = `favorites-test-${Date.now()}`;

type SummaryBody = { id: string; title: string };

describe.skipIf(!databaseUrl)("API REST de favoritos", () => {
  let client: PrismaClient;
  let counter = 0;
  let publishedId: string;
  let secondPublishedId: string;
  let draftId: string;

  const propertyData = (title: string, isPublished: boolean) => ({
    title: `${testRunIdentifier} ${title}`,
    description: "Propiedad de prueba",
    operation: "SALE" as const,
    type: "HOUSE" as const,
    price: 1000000,
    address: "Calle de prueba 1",
    commune: "Roma Norte",
    city: "Ciudad de México",
    region: "Ciudad de México",
    isPublished,
  });

  async function createSession(): Promise<{ token: string; userId: string }> {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Prueba Favoritos",
          email: `${testRunIdentifier}-${++counter}@example.com`,
          password: "clave-segura-1",
        }),
      }),
    );
    const { id } = (await response.json()) as { id: string };
    const token = /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
    return { token: token as string, userId: id };
  }

  function request(method: string, path: string, token?: string): NextRequest {
    return new NextRequest(`http://localhost/api/favorites${path}`, {
      method,
      headers: token ? { cookie: `${sessionCookieName}=${token}` } : {},
    });
  }

  const list = async (token?: string) =>
    listFavorites(request("GET", "", token), { params: Promise.resolve({}) });
  const put = (propertyId: string, token?: string) =>
    addFavorite(request("PUT", `/${propertyId}`, token), {
      params: Promise.resolve({ propertyId }),
    });
  const del = (propertyId: string, token?: string) =>
    removeFavorite(request("DELETE", `/${propertyId}`, token), {
      params: Promise.resolve({ propertyId }),
    });

  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "t".repeat(48));
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    publishedId = (await client.property.create({ data: propertyData("publicada", true) })).id;
    secondPublishedId = (await client.property.create({ data: propertyData("segunda", true) })).id;
    draftId = (await client.property.create({ data: propertyData("borrador", false) })).id;
  });

  afterAll(async () => {
    await client.user.deleteMany({ where: { email: { startsWith: testRunIdentifier } } });
    await client.property.deleteMany({ where: { title: { startsWith: testRunIdentifier } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("responde 401 sin sesión en las tres operaciones", async () => {
    expect((await list()).status).toBe(401);
    expect((await put(publishedId)).status).toBe(401);
    expect((await del(publishedId)).status).toBe(401);
  });

  it("un ADMIN no usa favoritos: 403 en las tres operaciones y no se guarda nada", async () => {
    const { token, userId } = await createSession();
    await client.user.update({ where: { id: userId }, data: { role: "ADMIN" } });

    expect((await list(token)).status).toBe(403);
    expect((await put(publishedId, token)).status).toBe(403);
    expect((await del(publishedId, token)).status).toBe(403);
    expect(await client.favorite.count({ where: { userId } })).toBe(0);
  });

  it("empieza vacío, guarda una propiedad y la lista", async () => {
    const { token } = await createSession();
    expect(await (await list(token)).json()).toEqual([]);

    const added = await put(publishedId, token);
    expect(added.status).toBe(200);
    expect(((await added.json()) as SummaryBody).id).toBe(publishedId);

    const favorites = (await (await list(token)).json()) as SummaryBody[];
    expect(favorites.map((favorite) => favorite.id)).toEqual([publishedId]);
  });

  it("no duplica: guardar dos veces la misma propiedad deja una sola fila", async () => {
    const { token, userId } = await createSession();

    expect((await put(publishedId, token)).status).toBe(200);
    expect((await put(publishedId, token)).status).toBe(200);

    expect(await client.favorite.count({ where: { userId, propertyId: publishedId } })).toBe(1);
  });

  it("resiste solicitudes simultáneas sin duplicar ni fallar", async () => {
    const { token, userId } = await createSession();

    const responses = await Promise.all([1, 2, 3, 4].map(() => put(publishedId, token)));

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200]);
    expect(await client.favorite.count({ where: { userId } })).toBe(1);
  });

  it("lista la más reciente primero", async () => {
    const { token } = await createSession();
    await put(publishedId, token);
    await put(secondPublishedId, token);

    const favorites = (await (await list(token)).json()) as SummaryBody[];
    expect(favorites.map((favorite) => favorite.id)).toEqual([secondPublishedId, publishedId]);
  });

  it("quita de favoritos con 204, también si no estaba guardada", async () => {
    const { token } = await createSession();
    await put(publishedId, token);

    expect((await del(publishedId, token)).status).toBe(204);
    expect((await del(publishedId, token)).status).toBe(204);
    expect(await (await list(token)).json()).toEqual([]);
  });

  it("responde 404 si la propiedad no existe o es un borrador, y no guarda nada", async () => {
    const { token, userId } = await createSession();

    expect((await put("no-existe", token)).status).toBe(404);
    expect((await put(draftId, token)).status).toBe(404);
    expect(await client.favorite.count({ where: { userId } })).toBe(0);
  });

  it("cada usuario ve y modifica solo sus favoritos", async () => {
    const ana = await createSession();
    const beto = await createSession();
    await put(publishedId, ana.token);

    expect(await (await list(beto.token)).json()).toEqual([]);
    await del(publishedId, beto.token);
    expect(((await (await list(ana.token)).json()) as SummaryBody[]).length).toBe(1);
  });

  it("no lista una favorita que dejó de estar publicada", async () => {
    const { token } = await createSession();
    await put(secondPublishedId, token);
    await client.property.update({
      where: { id: secondPublishedId },
      data: { isPublished: false },
    });

    expect(await (await list(token)).json()).toEqual([]);
    await client.property.update({ where: { id: secondPublishedId }, data: { isPublished: true } });
  });
});

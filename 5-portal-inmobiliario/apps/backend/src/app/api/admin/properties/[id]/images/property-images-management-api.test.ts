import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";
import { DELETE, PATCH } from "./[imageId]/route";
import { PUT } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const runIdentifier = `images-manage-${Date.now()}`;

describe.skipIf(!databaseUrl)("API REST: administración de imágenes de propiedades", () => {
  let client: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let propertyId: string;
  let otherPropertyId: string;
  let imageIds: string[];
  let counter = 0;
  let cloudinaryFetch: ReturnType<typeof vi.fn>;

  async function createSession(role: "USER" | "ADMIN") {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Prueba Gestión",
          email: `${runIdentifier}-${++counter}@example.com`,
          password: "clave-segura-1",
        }),
      }),
    );
    const { id } = (await response.json()) as { id: string };
    await client.user.update({ where: { id }, data: { role } });
    return /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1] as string;
  }

  const createProperty = (suffix: string) =>
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
      },
    });

  /** Tres imágenes: a (principal, 0), b (1), c (2). */
  async function seedImages(targetPropertyId: string) {
    await client.propertyImage.deleteMany({ where: { propertyId: targetPropertyId } });
    const created = [];
    for (const [position, name] of ["a", "b", "c"].entries()) {
      created.push(
        await client.propertyImage.create({
          data: {
            propertyId: targetPropertyId,
            url: `https://res.cloudinary.com/demo/${runIdentifier}-${name}.jpg`,
            publicId: `propiedades-claude/${runIdentifier}-${name}`,
            position,
            isPrimary: position === 0,
          },
        }),
      );
    }
    return created.map((image) => image.id);
  }

  const headers = (token: string | null) => ({
    "Content-Type": "application/json",
    ...(token ? { cookie: `${sessionCookieName}=${token}` } : {}),
  });

  const patchImage = (id: string, imageId: string, token: string | null, body: unknown) =>
    PATCH(
      new NextRequest(`http://localhost/api/admin/properties/${id}/images/${imageId}`, {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id, imageId }) },
    );

  const deleteImage = (id: string, imageId: string, token: string | null) =>
    DELETE(
      new NextRequest(`http://localhost/api/admin/properties/${id}/images/${imageId}`, {
        method: "DELETE",
        headers: headers(token),
      }),
      { params: Promise.resolve({ id, imageId }) },
    );

  const reorder = (id: string, token: string | null, body: unknown) =>
    PUT(
      new NextRequest(`http://localhost/api/admin/properties/${id}/images`, {
        method: "PUT",
        headers: headers(token),
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );

  const stubCloudinary = (result = "ok") => {
    cloudinaryFetch = vi.fn().mockResolvedValue(Response.json({ result }));
    vi.stubGlobal("fetch", cloudinaryFetch);
  };

  const readImages = () =>
    client.propertyImage.findMany({ where: { propertyId }, orderBy: { position: "asc" } });

  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "t".repeat(48));
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "demo");
    vi.stubEnv("CLOUDINARY_API_KEY", "key-123");
    vi.stubEnv("CLOUDINARY_API_SECRET", "secret-xyz");
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    adminToken = await createSession("ADMIN");
    userToken = await createSession("USER");
    propertyId = (await createProperty("principal")).id;
    otherPropertyId = (await createProperty("otra")).id;
  });

  // Cada prueba parte de tres imágenes conocidas.
  const prepare = async () => {
    imageIds = await seedImages(propertyId);
    stubCloudinary();
  };

  afterEach(() => vi.unstubAllGlobals());

  afterAll(async () => {
    await client.property.deleteMany({ where: { title: { startsWith: runIdentifier } } });
    await client.user.deleteMany({ where: { email: { startsWith: runIdentifier } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("exige sesión (401) y rol ADMIN (403)", async () => {
    await prepare();
    expect((await deleteImage(propertyId, imageIds[0], null)).status).toBe(401);
    expect((await patchImage(propertyId, imageIds[1], userToken, { isPrimary: true })).status).toBe(
      403,
    );
    expect((await reorder(propertyId, userToken, { imageIds })).status).toBe(403);
    expect(cloudinaryFetch).not.toHaveBeenCalled();
  });

  it("marca otra imagen como principal y deja solo una", async () => {
    await prepare();
    const response = await patchImage(propertyId, imageIds[2], adminToken, { isPrimary: true });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; isPrimary: boolean }[];
    expect(body.filter((image) => image.isPrimary).map((image) => image.id)).toEqual([imageIds[2]]);
    expect((await readImages()).filter((image) => image.isPrimary)).toHaveLength(1);
  });

  it("valida el cuerpo y que la imagen pertenezca a la propiedad", async () => {
    await prepare();
    expect(
      (await patchImage(propertyId, imageIds[1], adminToken, { isPrimary: false })).status,
    ).toBe(400);
    expect(
      (await patchImage(otherPropertyId, imageIds[1], adminToken, { isPrimary: true })).status,
    ).toBe(404);
    expect(
      (await patchImage("no-existe", imageIds[1], adminToken, { isPrimary: true })).status,
    ).toBe(404);
  });

  it("reordena y rechaza listas que no coinciden con las imágenes", async () => {
    await prepare();
    const [a, b, c] = imageIds;
    const response = await reorder(propertyId, adminToken, { imageIds: [c, a, b] });
    expect(response.status).toBe(200);
    expect(((await response.json()) as { id: string }[]).map((image) => image.id)).toEqual([
      c,
      a,
      b,
    ]);
    expect((await readImages()).map((image) => image.id)).toEqual([c, a, b]);

    expect((await reorder(propertyId, adminToken, { imageIds: [a, b] })).status).toBe(400);
    expect((await reorder(propertyId, adminToken, { imageIds: [a, a, b] })).status).toBe(400);
    expect((await reorder(propertyId, adminToken, { imageIds: [] })).status).toBe(400);
    expect((await reorder("no-existe", adminToken, { imageIds })).status).toBe(404);
  });

  it("elimina de Cloudinary y de la base, promueve la siguiente principal y compacta posiciones", async () => {
    await prepare();
    const response = await deleteImage(propertyId, imageIds[0], adminToken);
    expect(response.status).toBe(204);

    const [, init] = cloudinaryFetch.mock.calls[0] as [string, { body: FormData }];
    expect(cloudinaryFetch.mock.calls[0][0]).toBe(
      "https://api.cloudinary.com/v1_1/demo/image/destroy",
    );
    expect(init.body.get("public_id")).toBe(`propiedades-claude/${runIdentifier}-a`);

    const remaining = await readImages();
    expect(remaining.map((image) => [image.id, image.position, image.isPrimary])).toEqual([
      [imageIds[1], 0, true],
      [imageIds[2], 1, false],
    ]);
  });

  it("acepta que Cloudinary ya no tenga la imagen (reintento seguro)", async () => {
    await prepare();
    stubCloudinary("not found");
    expect((await deleteImage(propertyId, imageIds[1], adminToken)).status).toBe(204);
    expect(await readImages()).toHaveLength(2);
  });

  it("si Cloudinary falla responde 502 y no borra la fila", async () => {
    await prepare();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ error: { message: "x" } }, { status: 500 })),
    );

    expect((await deleteImage(propertyId, imageIds[1], adminToken)).status).toBe(502);
    expect(await readImages()).toHaveLength(3);
    error.mockRestore();
  });

  it("responde 404 si la imagen es de otra propiedad", async () => {
    await prepare();
    expect((await deleteImage(otherPropertyId, imageIds[0], adminToken)).status).toBe(404);
    expect(cloudinaryFetch).not.toHaveBeenCalled();
    expect(await readImages()).toHaveLength(3);
  });
});

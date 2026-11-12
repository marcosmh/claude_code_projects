import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";
import { PROPERTY_IMAGE_MAX_BYTES } from "@portal/shared-types";
import { POST as uploadImage } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const runIdentifier = `images-api-${Date.now()}`;

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

describe.skipIf(!databaseUrl)("API REST: subida de imágenes de propiedades", () => {
  let client: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let propertyId: string;
  let counter = 0;
  let uploadCount = 0;
  let cloudinaryFetch: ReturnType<typeof vi.fn>;

  async function createSession(role: "USER" | "ADMIN") {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Prueba Imágenes",
          email: `${runIdentifier}-${++counter}@example.com`,
          password: "clave-segura-1",
        }),
      }),
    );
    const { id } = (await response.json()) as { id: string };
    await client.user.update({ where: { id }, data: { role } });
    return /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1] as string;
  }

  /** Solicitud multipart como la enviaría el navegador. */
  function buildRequest(
    id: string,
    token: string | null,
    file: File | null = new File([jpegBytes], "casa.jpg", { type: "image/jpeg" }),
  ) {
    const form = new FormData();
    if (file) form.set("file", file);
    return uploadImage(
      new NextRequest(`http://localhost/api/admin/properties/${id}/images`, {
        method: "POST",
        headers: token ? { cookie: `${sessionCookieName}=${token}` } : {},
        body: form,
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  beforeAll(async () => {
    vi.stubEnv("AUTH_SECRET", "t".repeat(48));
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "demo");
    vi.stubEnv("CLOUDINARY_API_KEY", "key-123");
    vi.stubEnv("CLOUDINARY_API_SECRET", "secret-xyz");
    vi.stubEnv("CLOUDINARY_FOLDER", "");
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    adminToken = await createSession("ADMIN");
    userToken = await createSession("USER");
    const property = await client.property.create({
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
    });
    propertyId = property.id;
  });

  // Cloudinary simulado: nunca se sube nada de verdad desde las pruebas.
  const stubCloudinary = (response?: () => Response) => {
    cloudinaryFetch = vi.fn().mockImplementation(async (_url: string, init: { body: FormData }) => {
      if (response) return response();
      uploadCount += 1;
      const folder = String(init.body.get("folder"));
      return Response.json({
        secure_url: `https://res.cloudinary.com/demo/image/upload/${folder}/${runIdentifier}-${uploadCount}.jpg`,
        public_id: `${folder}/${runIdentifier}-${uploadCount}`,
      });
    });
    vi.stubGlobal("fetch", cloudinaryFetch);
  };

  afterEach(() => vi.unstubAllGlobals());

  afterAll(async () => {
    await client.property.deleteMany({ where: { title: { startsWith: runIdentifier } } });
    await client.user.deleteMany({ where: { email: { startsWith: runIdentifier } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("exige sesión (401) y rol ADMIN (403)", async () => {
    stubCloudinary();
    expect((await buildRequest(propertyId, null)).status).toBe(401);
    expect((await buildRequest(propertyId, userToken)).status).toBe(403);
    expect(cloudinaryFetch).not.toHaveBeenCalled();
  });

  it("sube a la carpeta propiedades-claude y guarda url y publicId; la primera es la principal", async () => {
    stubCloudinary();

    const first = await buildRequest(propertyId, adminToken);
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as {
      id: string;
      url: string;
      position: number;
      isPrimary: boolean;
    };
    expect(firstBody).toMatchObject({ position: 0, isPrimary: true });
    expect(firstBody.url).toContain("/propiedades-claude/");

    const [url, init] = cloudinaryFetch.mock.calls[0] as [string, { body: FormData }];
    expect(url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(init.body.get("folder")).toBe("propiedades-claude");

    const second = await buildRequest(propertyId, adminToken);
    expect(second.status).toBe(201);
    expect(await second.json()).toMatchObject({ position: 1, isPrimary: false });

    const stored = await client.propertyImage.findMany({
      where: { propertyId },
      orderBy: { position: "asc" },
    });
    expect(stored).toHaveLength(2);
    expect(stored[0]?.publicId.startsWith("propiedades-claude/")).toBe(true);
    expect(stored.filter((image) => image.isPrimary)).toHaveLength(1);
  });

  it("valida archivo, tipo y tamaño sin llamar a Cloudinary", async () => {
    stubCloudinary();

    expect((await buildRequest(propertyId, adminToken, null)).status).toBe(400);
    expect(
      (
        await buildRequest(
          propertyId,
          adminToken,
          new File([], "vacio.jpg", { type: "image/jpeg" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await buildRequest(
          propertyId,
          adminToken,
          new File(["hola"], "nota.txt", { type: "text/plain" }),
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await buildRequest(
          propertyId,
          adminToken,
          new File(["<script>alert(1)</script>"], "falsa.jpg", { type: "image/jpeg" }),
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await buildRequest(
          propertyId,
          adminToken,
          new File([new Uint8Array(PROPERTY_IMAGE_MAX_BYTES + 1)], "grande.jpg", {
            type: "image/jpeg",
          }),
        )
      ).status,
    ).toBe(413);
    expect(cloudinaryFetch).not.toHaveBeenCalled();
  });

  it("rechaza con 413 por Content-Length antes de leer un cuerpo enorme", async () => {
    stubCloudinary();
    const response = await uploadImage(
      new NextRequest(`http://localhost/api/admin/properties/${propertyId}/images`, {
        method: "POST",
        headers: {
          cookie: `${sessionCookieName}=${adminToken}`,
          "content-length": String(PROPERTY_IMAGE_MAX_BYTES * 3),
          "content-type": "multipart/form-data; boundary=x",
        },
        body: "--x--",
      }),
      { params: Promise.resolve({ id: propertyId }) },
    );
    expect(response.status).toBe(413);
    expect(cloudinaryFetch).not.toHaveBeenCalled();
  });

  it("responde 404 con una propiedad inexistente o eliminada", async () => {
    stubCloudinary();
    expect((await buildRequest("no-existe", adminToken)).status).toBe(404);

    const deleted = await client.property.create({
      data: {
        title: `${runIdentifier} eliminada`,
        description: "Eliminada",
        operation: "RENT",
        type: "OFFICE",
        price: 1,
        address: "x",
        commune: "x",
        city: "x",
        region: "x",
        deletedAt: new Date(),
      },
    });
    expect((await buildRequest(deleted.id, adminToken)).status).toBe(404);
    expect(cloudinaryFetch).not.toHaveBeenCalled();
  });

  it("responde 502 si Cloudinary falla y no guarda nada", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const before = await client.propertyImage.count({ where: { propertyId } });
    stubCloudinary(() =>
      Response.json({ error: { message: "Invalid Signature" } }, { status: 401 }),
    );

    const response = await buildRequest(propertyId, adminToken);

    expect(response.status).toBe(502);
    expect(await client.propertyImage.count({ where: { propertyId } })).toBe(before);
    error.mockRestore();
  });

  it("responde 503 si Cloudinary no está configurado", async () => {
    stubCloudinary();
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    expect((await buildRequest(propertyId, adminToken)).status).toBe(503);
    expect(cloudinaryFetch).not.toHaveBeenCalled();
    vi.stubEnv("CLOUDINARY_API_SECRET", "secret-xyz");
  });
});

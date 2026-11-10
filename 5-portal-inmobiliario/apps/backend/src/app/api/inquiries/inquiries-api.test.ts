import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";

// Nunca se llama a Web3Forms de verdad durante las pruebas.
const sendNotification = vi.hoisted(() => vi.fn());
vi.mock("@/lib/integrations/web3forms", () => ({ web3FormsNotifier: { send: sendNotification } }));

import { POST as createInquiry } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const testRunIdentifier = `inquiry-test-${Date.now()}`;

const validBody = {
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "+52 55 1234 5678",
  message: "Me interesa visitar la propiedad este fin de semana.",
};

function buildRequest(body: unknown, raw = false, token?: string): NextRequest {
  return new NextRequest("http://localhost/api/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { cookie: `${sessionCookieName}=${token}` } : {}),
    },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

describe.skipIf(!databaseUrl)("API REST de consultas", () => {
  let client: PrismaClient;
  let publishedId: string;
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

  beforeAll(async () => {
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    publishedId = (await client.property.create({ data: propertyData("publicada", true) })).id;
    draftId = (await client.property.create({ data: propertyData("borrador", false) })).id;
  });

  beforeEach(() => sendNotification.mockReset().mockResolvedValue(true));

  afterAll(async () => {
    // Las consultas se eliminan en cascada con la propiedad.
    await client.property.deleteMany({ where: { title: { startsWith: testRunIdentifier } } });
    await client.$disconnect();
  });

  it("POST /api/inquiries guarda la consulta y responde 201", async () => {
    const response = await createInquiry(buildRequest({ ...validBody, propertyId: publishedId }));
    const body = (await response.json()) as { id: string; notificationSent: boolean };

    expect(response.status).toBe(201);
    expect(body.notificationSent).toBe(true);
    const stored = await client.inquiry.findUnique({ where: { id: body.id } });
    expect(stored).toMatchObject({
      propertyId: publishedId,
      userId: null,
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "+52 55 1234 5678",
    });
  });

  describe("asociación con el usuario", () => {
    const userEmail = `${testRunIdentifier}-usuario@example.com`;

    async function signUp() {
      vi.stubEnv("AUTH_SECRET", "t".repeat(48));
      const response = await register(
        new NextRequest("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Ana Pérez", email: userEmail, password: "clave-segura-1" }),
        }),
      );
      const { id } = (await response.json()) as { id: string };
      const token = /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
      return { id, token: token as string };
    }

    afterAll(async () => {
      await client.user.deleteMany({ where: { email: userEmail } });
      vi.unstubAllEnvs();
    });

    it("asocia la consulta al usuario con sesión iniciada", async () => {
      const { id, token } = await signUp();

      const response = await createInquiry(
        buildRequest({ ...validBody, propertyId: publishedId }, false, token),
      );

      expect(response.status).toBe(201);
      const { id: inquiryId } = (await response.json()) as { id: string };
      expect((await client.inquiry.findUniqueOrThrow({ where: { id: inquiryId } })).userId).toBe(
        id,
      );
    });

    it("trata como visitante una cookie inválida: la consulta se guarda sin usuario", async () => {
      const response = await createInquiry(
        buildRequest({ ...validBody, propertyId: publishedId }, false, "token-falso"),
      );

      expect(response.status).toBe(201);
      const { id: inquiryId } = (await response.json()) as { id: string };
      expect(
        (await client.inquiry.findUniqueOrThrow({ where: { id: inquiryId } })).userId,
      ).toBeNull();
    });

    it("ignora un userId enviado en el cuerpo", async () => {
      const email = `${testRunIdentifier}-ajeno@example.com`;
      const other = await client.user.create({ data: { email, name: "Ajeno", passwordHash: "x" } });

      const response = await createInquiry(
        buildRequest({ ...validBody, propertyId: publishedId, userId: other.id }),
      );

      const { id: inquiryId } = (await response.json()) as { id: string };
      expect(
        (await client.inquiry.findUniqueOrThrow({ where: { id: inquiryId } })).userId,
      ).toBeNull();
      await client.user.delete({ where: { id: other.id } });
    });

    it("conserva la consulta cuando se elimina al usuario (userId pasa a null)", async () => {
      const email = `${testRunIdentifier}-borrar@example.com`;
      const user = await client.user.create({ data: { email, name: "Temp", passwordHash: "x" } });
      const inquiry = await client.inquiry.create({
        data: {
          propertyId: publishedId,
          userId: user.id,
          name: "Temp",
          email,
          message: "Hola, quiero informes",
        },
      });

      await client.user.delete({ where: { id: user.id } });

      expect(
        (await client.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } })).userId,
      ).toBeNull();
    });
  });

  it("envía a Web3Forms el id y el título de la propiedad", async () => {
    await createInquiry(buildRequest({ ...validBody, propertyId: publishedId }));
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: publishedId,
        propertyTitle: `${testRunIdentifier} publicada`,
        email: "ana@example.com",
      }),
    );
  });

  it("conserva la consulta aunque falle Web3Forms", async () => {
    sendNotification.mockResolvedValue(false);
    const response = await createInquiry(buildRequest({ ...validBody, propertyId: publishedId }));
    const body = (await response.json()) as { id: string; notificationSent: boolean };

    expect(response.status).toBe(201);
    expect(body.notificationSent).toBe(false);
    expect(await client.inquiry.findUnique({ where: { id: body.id } })).not.toBeNull();
  });

  it("responde 404 y no guarda nada para propiedades no publicadas o inexistentes", async () => {
    for (const propertyId of [draftId, "id-inexistente"]) {
      const response = await createInquiry(buildRequest({ ...validBody, propertyId }));
      expect(response.status).toBe(404);
    }
    expect(await client.inquiry.count({ where: { propertyId: draftId } })).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("responde 400 con datos inválidos y detalla los campos", async () => {
    const countBefore = await client.inquiry.count({ where: { propertyId: publishedId } });
    const response = await createInquiry(
      buildRequest({ propertyId: publishedId, name: "A", email: "x", message: "hola" }),
    );
    const body = (await response.json()) as { details: { field: string }[] };

    expect(response.status).toBe(400);
    expect(body.details.map((detail) => detail.field).sort()).toEqual(["email", "message", "name"]);
    expect(await client.inquiry.count({ where: { propertyId: publishedId } })).toBe(countBefore);
  });

  it("responde 400 si el cuerpo no es JSON", async () => {
    const response = await createInquiry(buildRequest("{no-json", true));
    expect(response.status).toBe(400);
  });
});

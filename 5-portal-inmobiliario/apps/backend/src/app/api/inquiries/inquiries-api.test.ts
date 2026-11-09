import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

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

function buildRequest(body: unknown, raw = false): NextRequest {
  return new NextRequest("http://localhost/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

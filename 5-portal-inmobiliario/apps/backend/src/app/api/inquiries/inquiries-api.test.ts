import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";

import { POST as createInquiry } from "./route";
import { GET as listMine } from "./mine/route";
import { DELETE as deleteInquiry } from "./[inquiryId]/route";

const databaseUrl = process.env.DATABASE_URL;
const testRunIdentifier = `inquiry-test-${Date.now()}`;

const validBody = {
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "+52 55 1234 5678",
  message: "Me interesa visitar la propiedad este fin de semana.",
};

let requestCounter = 0;

/** Cada petición simula una IP distinta para no agotar el rate limit por IP. */
const uniqueIp = () => `10.1.${Math.floor(requestCounter / 250)}.${++requestCounter % 250}`;

function buildRequest(body: unknown, raw = false, token?: string): NextRequest {
  return new NextRequest("http://localhost/api/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": uniqueIp(),
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

  afterAll(async () => {
    // Las consultas se eliminan en cascada con la propiedad.
    await client.property.deleteMany({ where: { title: { startsWith: testRunIdentifier } } });
    await client.$disconnect();
  });

  it("POST /api/inquiries guarda la consulta y responde 201", async () => {
    const response = await createInquiry(buildRequest({ ...validBody, propertyId: publishedId }));
    const body = (await response.json()) as { id: string };

    expect(response.status).toBe(201);
    expect(body).toEqual({ id: expect.any(String) });
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

  it("responde 404 y no guarda nada para propiedades no publicadas o inexistentes", async () => {
    for (const propertyId of [draftId, "id-inexistente"]) {
      const response = await createInquiry(buildRequest({ ...validBody, propertyId }));
      expect(response.status).toBe(404);
    }
    expect(await client.inquiry.count({ where: { propertyId: draftId } })).toBe(0);
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
  describe("GET /api/inquiries/properties", () => {
    let counter = 0;

    async function newSession() {
      vi.stubEnv("AUTH_SECRET", "t".repeat(48));
      const response = await register(
        new NextRequest("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Ana Pérez",
            email: `${testRunIdentifier}-lista-${++counter}@example.com`,
            password: "clave-segura-1",
          }),
        }),
      );
      const token = /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
      return token as string;
    }

    const listPage = (token?: string, search = "") =>
      listMine(
        new NextRequest(`http://localhost/api/inquiries/mine${search}`, {
          headers: token ? { cookie: `${sessionCookieName}=${token}` } : {},
        }),
        { params: Promise.resolve({}) },
      );

    const list = async (token?: string) => {
      const response = await listPage(token);
      return response.status === 200
        ? Response.json(((await response.json()) as { items: unknown[] }).items)
        : response;
    };

    const remove = (inquiryId: string, token?: string) =>
      deleteInquiry(
        new NextRequest(`http://localhost/api/inquiries/${inquiryId}`, {
          method: "DELETE",
          headers: token ? { cookie: `${sessionCookieName}=${token}` } : {},
        }),
        { params: Promise.resolve({ inquiryId }) },
      );

    const inquire = (propertyId: string, token?: string) =>
      createInquiry(buildRequest({ ...validBody, propertyId }, false, token));

    afterAll(async () => {
      await client.user.deleteMany({
        where: { email: { startsWith: `${testRunIdentifier}-lista` } },
      });
    });

    it("un ADMIN no usa consultas propias: 403 al listar y al eliminar", async () => {
      const token = await newSession();
      await inquire(publishedId, token);
      const [created] = (await (await list(token)).json()) as { id: string }[];
      await client.user.updateMany({
        where: { email: { startsWith: `${testRunIdentifier}-lista` } },
        data: { role: "ADMIN" },
      });

      expect((await listPage(token)).status).toBe(403);
      expect((await remove(created.id, token)).status).toBe(403);
      expect(await client.inquiry.count({ where: { id: created.id } })).toBe(1);
    });

    it("responde 401 sin sesión", async () => {
      expect((await list()).status).toBe(401);
    });

    it("empieza vacío y lista cada consulta con asunto y mensaje", async () => {
      const token = await newSession();
      expect(await (await list(token)).json()).toEqual([]);

      await inquire(publishedId, token);
      await inquire(publishedId, token);

      const inquiries = (await (await list(token)).json()) as {
        propertyId: string;
        subject: string;
        message: string;
      }[];
      expect(inquiries).toHaveLength(2);
      expect(inquiries[0]).toMatchObject({
        propertyId: publishedId,
        subject: `Nueva consulta: ${testRunIdentifier} publicada`,
        message: validBody.message,
      });
    });

    it("no incluye consultas de visitantes ni de otros usuarios", async () => {
      const token = await newSession();
      const otherToken = await newSession();
      await inquire(publishedId);
      await inquire(publishedId, otherToken);

      expect(await (await list(token)).json()).toEqual([]);
    });

    it("no lista una propiedad que dejó de estar publicada", async () => {
      const token = await newSession();
      await inquire(publishedId, token);
      await client.property.update({ where: { id: publishedId }, data: { isPublished: false } });

      expect(await (await list(token)).json()).toEqual([]);
      await client.property.update({ where: { id: publishedId }, data: { isPublished: true } });
    });

    it("elimina una consulta propia (204) y deja de listarse", async () => {
      const token = await newSession();
      await inquire(publishedId, token);
      const [created] = (await (await list(token)).json()) as { id: string }[];

      expect((await remove(created.id, token)).status).toBe(204);
      expect(await (await list(token)).json()).toEqual([]);
    });

    it("responde 401 sin sesión y 404 con la consulta de otra persona o inexistente", async () => {
      const token = await newSession();
      const otherToken = await newSession();
      await inquire(publishedId, token);
      const [created] = (await (await list(token)).json()) as { id: string }[];

      expect((await remove(created.id)).status).toBe(401);
      expect((await remove(created.id, otherToken)).status).toBe(404);
      expect((await remove("no-existe", token)).status).toBe(404);
      expect(await (await list(token)).json()).toHaveLength(1);
    });

    it("pagina de 6 en 6 y cuenta el total", async () => {
      const token = await newSession();
      for (let index = 0; index < 8; index++) await inquire(publishedId, token);

      const first = (await (await listPage(token)).json()) as {
        items: unknown[];
        total: number;
        totalPages: number;
      };
      expect(first).toMatchObject({ total: 8, totalPages: 2 });
      expect(first.items).toHaveLength(6);

      const second = (await (await listPage(token, "?page=2")).json()) as { items: unknown[] };
      expect(second.items).toHaveLength(2);
    });

    it("busca por título o mensaje, sin acentos, solo entre las consultas propias", async () => {
      const token = await newSession();
      const otherToken = await newSession();
      await createInquiry(
        buildRequest(
          { ...validBody, propertyId: publishedId, message: "Quiero información de renta" },
          false,
          token,
        ),
      );
      await inquire(publishedId, token);
      await createInquiry(
        buildRequest(
          { ...validBody, propertyId: publishedId, message: "Quiero información de renta" },
          false,
          otherToken,
        ),
      );

      const byMessage = (await (await listPage(token, "?q=INFORMACION")).json()) as {
        total: number;
      };
      expect(byMessage.total).toBe(1);
      const byTitle = (await (await listPage(token, "?q=publicada")).json()) as { total: number };
      expect(byTitle.total).toBe(2);
      const none = (await (await listPage(token, "?q=zzzz")).json()) as { total: number };
      expect(none.total).toBe(0);
    });

    it("rechaza parámetros inválidos con 400", async () => {
      const token = await newSession();
      expect((await listPage(token, "?page=0")).status).toBe(400);
    });
  });
});

describe("rate limit de POST /api/inquiries", () => {
  it("responde 429 con Retry-After tras 10 envíos por minuto desde una misma IP", async () => {
    const statuses: number[] = [];
    let retryAfter: string | null = null;
    for (let attempt = 1; attempt <= 11; attempt += 1) {
      const response = await createInquiry(
        new NextRequest("http://localhost/api/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.5" },
          body: "{}",
        }),
      );
      statuses.push(response.status);
      retryAfter = response.headers.get("retry-after");
    }
    expect(statuses.slice(0, 10).every((status) => status === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });
});

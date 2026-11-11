import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { sessionCookieName } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { POST as register } from "@/app/api/auth/register/route";
import { withRole } from "./with-role";

const databaseUrl = process.env.DATABASE_URL;
const emailPrefix = `authz-test-${Date.now()}`;

// Recursos protegidos de ejemplo: los reales llegan en los pasos 20 a 30 con este mismo envoltorio.
const userResource = withRole("USER", async (_request, { user }) =>
  Response.json({ recurso: "usuario", rol: user.role }),
);
const adminResource = withRole("ADMIN", async (_request, { user }) =>
  Response.json({ recurso: "admin", correo: user.email }),
);
const exactUserResource = withRole("USER", async () => Response.json({ recurso: "solo-usuario" }), {
  exact: true,
});
const failingResource = withRole("USER", async () => {
  throw new NotFoundError("Propiedad no encontrada");
});
const paramsResource = withRole<{ id: string }>("USER", async (_request, { params }) =>
  Response.json({ id: (await params).id }),
);

const noParams = { params: Promise.resolve({}) };

describe.skipIf(!databaseUrl)("autorización de Route Handlers con withRole", () => {
  let client: PrismaClient;
  let counter = 0;

  async function createSession(options: { role?: "USER" | "ADMIN"; isActive?: boolean } = {}) {
    const email = `${emailPrefix}-${++counter}@example.com`;
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Prueba Authz", email, password: "clave-segura-1" }),
      }),
    );
    const created = (await response.json()) as { id: string };
    const token = /portal_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
    if (options.role || options.isActive !== undefined) {
      await client.user.update({
        where: { id: created.id },
        data: {
          ...(options.role && { role: options.role }),
          ...(options.isActive !== undefined && { isActive: options.isActive }),
        },
      });
    }
    return { id: created.id, token: token as string };
  }

  const requestWith = (token?: string) =>
    new NextRequest("http://localhost/api/recurso", {
      headers: token ? { cookie: `${sessionCookieName}=${token}` } : {},
    });

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

  it("sin sesión responde 401 en recursos de USER y de ADMIN", async () => {
    for (const resource of [userResource, adminResource]) {
      const response = await resource(requestWith(), noParams);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ status: 401 });
    }
  });

  it("un USER accede a recursos de USER pero recibe 403 en los de ADMIN", async () => {
    const { token } = await createSession();

    const allowed = await userResource(requestWith(token), noParams);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ recurso: "usuario", rol: "USER" });

    const denied = await adminResource(requestWith(token), noParams);
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({
      status: 403,
      message: "No tienes permiso para realizar esta acción",
    });
  });

  it("un ADMIN accede a recursos de ADMIN y también a los de USER", async () => {
    const { token } = await createSession({ role: "ADMIN" });

    const adminResponse = await adminResource(requestWith(token), noParams);
    expect(adminResponse.status).toBe(200);
    expect(await adminResponse.json()).toMatchObject({ recurso: "admin" });
    expect((await userResource(requestWith(token), noParams)).status).toBe(200);
  });

  it("con { exact: true } un USER entra y un ADMIN recibe 403", async () => {
    const user = await createSession();
    const admin = await createSession({ role: "ADMIN" });

    expect((await exactUserResource(requestWith(user.token), noParams)).status).toBe(200);
    expect((await exactUserResource(requestWith(admin.token), noParams)).status).toBe(403);
    expect((await exactUserResource(requestWith(), noParams)).status).toBe(401);
  });

  it("el cambio de rol en la base surte efecto sin volver a iniciar sesión", async () => {
    const { id, token } = await createSession({ role: "ADMIN" });
    expect((await adminResource(requestWith(token), noParams)).status).toBe(200);

    await client.user.update({ where: { id }, data: { role: "USER" } });

    expect((await adminResource(requestWith(token), noParams)).status).toBe(403);
  });

  it("una cuenta desactivada pierde el acceso aunque conserve su cookie", async () => {
    const { id, token } = await createSession({ role: "ADMIN" });
    await client.user.update({ where: { id }, data: { isActive: false } });

    expect((await adminResource(requestWith(token), noParams)).status).toBe(401);
    expect((await userResource(requestWith(token), noParams)).status).toBe(401);
  });

  it("una cuenta eliminada pierde el acceso", async () => {
    const { id, token } = await createSession();
    await client.user.delete({ where: { id } });
    expect((await userResource(requestWith(token), noParams)).status).toBe(401);
  });

  it("rechaza cookies manipuladas y tokens de otro secreto", async () => {
    const { token } = await createSession({ role: "ADMIN" });
    for (const forged of [`${token.slice(0, -3)}abc`, "no-es-un-token"]) {
      expect((await adminResource(requestWith(forged), noParams)).status).toBe(401);
    }
  });

  it("traduce los errores de dominio del handler a su código HTTP", async () => {
    const { token } = await createSession();
    const response = await failingResource(requestWith(token), noParams);
    expect(response.status).toBe(404);
  });

  it("entrega al handler los parámetros de ruta", async () => {
    const { token } = await createSession();
    const response = await paramsResource(requestWith(token), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(await response.json()).toEqual({ id: "abc" });
  });
});

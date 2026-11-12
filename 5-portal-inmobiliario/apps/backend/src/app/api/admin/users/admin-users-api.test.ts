import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";
import { PATCH, GET as getUser } from "./[id]/route";
import { GET as listUsers, POST as createUser } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const runIdentifier = `users-api-${Date.now()}`;

describe.skipIf(!databaseUrl)("API REST: administración de usuarios", () => {
  let client: PrismaClient;
  let adminToken: string;
  let adminId: string;
  let userToken: string;
  let targetId: string;
  let counter = 0;

  async function createSession(role: "USER" | "ADMIN", name = "Prueba Usuarios") {
    const response = await register(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
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

  const headers = (token: string | null) => ({
    "Content-Type": "application/json",
    ...(token ? { cookie: `${sessionCookieName}=${token}` } : {}),
  });
  const list = (token: string | null, query = "") =>
    listUsers(
      new NextRequest(`http://localhost/api/admin/users?${query}`, { headers: headers(token) }),
      { params: Promise.resolve({}) },
    );
  const create = (token: string | null, body: unknown) =>
    createUser(
      new NextRequest("http://localhost/api/admin/users", {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({}) },
    );
  const get = (id: string, token: string | null) =>
    getUser(
      new NextRequest(`http://localhost/api/admin/users/${id}`, { headers: headers(token) }),
      {
        params: Promise.resolve({ id }),
      },
    );
  const patch = (id: string, token: string | null, body: unknown) =>
    PATCH(
      new NextRequest(`http://localhost/api/admin/users/${id}`, {
        method: "PATCH",
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
    ({ id: adminId, token: adminToken } = await createSession("ADMIN"));
    ({ token: userToken } = await createSession("USER"));
    ({ id: targetId } = await createSession("USER", "Ñandú Búsqueda"));
  });

  afterAll(async () => {
    await client.user.deleteMany({ where: { email: { startsWith: runIdentifier } } });
    await client.$disconnect();
    vi.unstubAllEnvs();
  });

  it("exige sesión (401) y rol ADMIN (403)", async () => {
    expect((await list(null)).status).toBe(401);
    expect((await list(userToken)).status).toBe(403);
    expect((await get(targetId, userToken)).status).toBe(403);
    expect((await patch(targetId, userToken, { isActive: false })).status).toBe(403);
  });

  it("lista, busca ignorando acentos y filtra por rol y estado sin exponer el hash", async () => {
    const searched = await list(adminToken, "search=nandu%20busqueda");
    expect(searched.status).toBe(200);
    const body = (await searched.json()) as { items: { id: string }[]; total: number };
    expect(body.items.map((item) => item.id)).toEqual([targetId]);
    expect(JSON.stringify(body)).not.toContain("passwordHash");

    const admins = (await (
      await list(adminToken, `role=ADMIN&search=${runIdentifier}`)
    ).json()) as {
      items: { role: string }[];
    };
    expect(admins.items.every((item) => item.role === "ADMIN")).toBe(true);
    const inactive = (await (
      await list(adminToken, `status=inactive&search=${runIdentifier}`)
    ).json()) as {
      total: number;
    };
    expect(inactive.total).toBe(0);
    expect((await list(adminToken, "role=SUPERADMIN")).status).toBe(400);
  });

  it("consulta un usuario y responde 404 si no existe", async () => {
    const response = await get(targetId, adminToken);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: targetId, favoritesCount: 0 });
    expect((await get("no-existe", adminToken)).status).toBe(404);
  });

  it("desactiva y reactiva una cuenta, y cambia su rol", async () => {
    const off = await patch(targetId, adminToken, { isActive: false });
    expect(off.status).toBe(200);
    expect(await off.json()).toMatchObject({ isActive: false });
    expect((await client.user.findUnique({ where: { id: targetId } }))?.isActive).toBe(false);

    const promoted = await patch(targetId, adminToken, { isActive: true, role: "ADMIN" });
    expect(await promoted.json()).toMatchObject({ isActive: true, role: "ADMIN" });
    await patch(targetId, adminToken, { role: "USER" });
    expect((await client.user.findUnique({ where: { id: targetId } }))?.role).toBe("USER");
  });

  it("valida el cuerpo, el usuario y la regla de no modificarse a sí mismo", async () => {
    expect((await patch(targetId, adminToken, {})).status).toBe(400);
    expect((await patch(targetId, adminToken, { role: "ROOT" })).status).toBe(400);
    expect((await patch("no-existe", adminToken, { isActive: false })).status).toBe(404);
    expect((await patch(adminId, adminToken, { isActive: false })).status).toBe(403);
    expect((await patch(adminId, adminToken, { role: "USER" })).status).toBe(403);
    expect((await client.user.findUnique({ where: { id: adminId } }))?.role).toBe("ADMIN");
  });

  it("da de alta usuarios normales y administradores sin exponer la contraseña", async () => {
    const email = `${runIdentifier}-alta-${Date.now()}@Example.com`;
    const response = await create(adminToken, {
      name: "Alta Admin",
      email,
      password: "clave-segura-1",
      role: "ADMIN",
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string; email: string; role: string };
    expect(body).toMatchObject({ email: email.toLowerCase(), role: "ADMIN", isActive: true });
    expect(JSON.stringify(body)).not.toContain("clave-segura-1");
    const stored = await client.user.findUnique({ where: { id: body.id } });
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toContain("clave-segura-1");

    const normal = await create(adminToken, {
      name: "Alta Normal",
      email: `${runIdentifier}-normal@example.com`,
      password: "clave-segura-1",
    });
    expect(normal.status).toBe(201);
    expect(await normal.json()).toMatchObject({ role: "USER" });
  });

  it("valida el alta: 401/403, datos inválidos y email repetido (409)", async () => {
    const valid = {
      name: "Repetido",
      email: `${runIdentifier}-dup@example.com`,
      password: "clave-segura-1",
    };
    expect((await create(null, valid)).status).toBe(401);
    expect((await create(userToken, valid)).status).toBe(403);
    expect((await create(adminToken, { ...valid, password: "corta" })).status).toBe(400);
    expect((await create(adminToken, { ...valid, role: "ROOT" })).status).toBe(400);
    expect((await create(adminToken, { ...valid, email: "no-es-email" })).status).toBe(400);

    expect((await create(adminToken, valid)).status).toBe(201);
    expect((await create(adminToken, valid)).status).toBe(409);
  });
});

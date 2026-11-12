import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { POST as register } from "@/app/api/auth/register/route";
import { sessionCookieName } from "@/lib/auth/session";

/**
 * Matriz de autorización de TODOS los endpoints de administración: se descubren por el sistema de
 * archivos, de modo que una ruta nueva sin `withRole("ADMIN")` hace fallar esta prueba.
 */
const routeModules = import.meta.glob<Record<string, unknown>>("./**/route.ts", { eager: true });
const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

type Handler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const handlers = Object.entries(routeModules).flatMap(([file, module]) =>
  httpMethods
    .filter((method) => typeof module[method] === "function")
    .map((method) => ({
      label: `${method} /api/admin/${file.replace("./", "").replace("/route.ts", "")}`,
      method,
      handler: module[method] as Handler,
    })),
);

const databaseUrl = process.env.DATABASE_URL;

describe("autorización de los endpoints /api/admin", () => {
  it("descubre las rutas de administración", () => {
    // Si el glob dejara de encontrar rutas, la matriz pasaría en vacío: se exige un mínimo.
    expect(handlers.length).toBeGreaterThanOrEqual(18);
  });

  it.each(handlers)("$label responde 401 sin sesión", async ({ method, handler }) => {
    const response = await handler(new NextRequest("http://localhost/api/admin/x", { method }), {
      params: Promise.resolve({ id: "x", imageId: "y" }),
    });
    expect(response.status).toBe(401);
  });

  describe.skipIf(!databaseUrl)("con una sesión USER", () => {
    let client: PrismaClient;
    let userToken: string;

    beforeAll(async () => {
      vi.stubEnv("AUTH_SECRET", "t".repeat(48));
      client = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl as string }),
      });
      const response = await register(
        new NextRequest("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Matriz Autorización",
            email: `authz-matrix-${Date.now()}@example.com`,
            password: "clave-segura-1",
          }),
        }),
      );
      userToken = /portal_session=([^;]+)/.exec(
        response.headers.get("set-cookie") ?? "",
      )?.[1] as string;
    });

    afterAll(async () => {
      await client.user.deleteMany({ where: { email: { startsWith: "authz-matrix-" } } });
      await client.$disconnect();
      vi.unstubAllEnvs();
    });

    it.each(handlers)("$label responde 403", async ({ method, handler }) => {
      const response = await handler(
        new NextRequest("http://localhost/api/admin/x", {
          method,
          headers: { cookie: `${sessionCookieName}=${userToken}` },
        }),
        { params: Promise.resolve({ id: "x", imageId: "y" }) },
      );
      expect(response.status).toBe(403);
    });
  });
});

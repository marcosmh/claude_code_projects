import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { AuthUserDto } from "@portal/shared-types";
import { createAuthorizer } from "./authorizer";
import { createSessionToken, sessionCookieName } from "./session";

beforeEach(() => vi.stubEnv("AUTH_SECRET", "a".repeat(48)));
afterEach(() => vi.unstubAllEnvs());

const regularUser: AuthUserDto = { id: "u1", email: "u@x.mx", name: "U", role: "USER" };
const adminUser: AuthUserDto = { id: "a1", email: "a@x.mx", name: "A", role: "ADMIN" };

function buildAuthorizer(users: Record<string, AuthUserDto> = { u1: regularUser, a1: adminUser }) {
  const getCurrentUser = vi.fn(async (userId: string) => {
    const user = users[userId];
    if (!user) throw new UnauthorizedError("Sesión no válida");
    return user;
  });
  return { authorizer: createAuthorizer({ getCurrentUser }), getCurrentUser };
}

async function requestFor(userId?: string): Promise<NextRequest> {
  const headers: Record<string, string> = {};
  if (userId) headers.cookie = `${sessionCookieName}=${await createSessionToken(userId)}`;
  return new NextRequest("http://localhost/api/algo", { headers });
}

describe("authenticate", () => {
  it("devuelve el usuario de la sesión", async () => {
    const { authorizer } = buildAuthorizer();
    expect(await authorizer.authenticate(await requestFor("u1"))).toEqual(regularUser);
  });

  it("lanza UnauthorizedError sin cookie y no consulta la base", async () => {
    const { authorizer, getCurrentUser } = buildAuthorizer();
    await expect(authorizer.authenticate(await requestFor())).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("lanza UnauthorizedError con un token falso o manipulado", async () => {
    const { authorizer, getCurrentUser } = buildAuthorizer();
    for (const token of ["no-es-un-token", `${await createSessionToken("u1")}x`]) {
      const request = new NextRequest("http://localhost/api/algo", {
        headers: { cookie: `${sessionCookieName}=${token}` },
      });
      await expect(authorizer.authenticate(request)).rejects.toBeInstanceOf(UnauthorizedError);
    }
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("propaga el rechazo cuando la cuenta ya no existe o está desactivada", async () => {
    const { authorizer } = buildAuthorizer({});
    await expect(authorizer.authenticate(await requestFor("u1"))).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});

describe("requireRole", () => {
  it("permite a USER recursos de USER y a ADMIN recursos de USER y de ADMIN", async () => {
    const { authorizer } = buildAuthorizer();
    expect(await authorizer.requireRole(await requestFor("u1"), "USER")).toEqual(regularUser);
    expect(await authorizer.requireRole(await requestFor("a1"), "USER")).toEqual(adminUser);
    expect(await authorizer.requireRole(await requestFor("a1"), "ADMIN")).toEqual(adminUser);
  });

  it("rechaza con ForbiddenError a un USER que pide un recurso de ADMIN", async () => {
    const { authorizer } = buildAuthorizer();
    await expect(authorizer.requireRole(await requestFor("u1"), "ADMIN")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("rechaza con UnauthorizedError (no 403) a quien no ha iniciado sesión", async () => {
    const { authorizer } = buildAuthorizer();
    await expect(authorizer.requireRole(await requestFor(), "ADMIN")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});

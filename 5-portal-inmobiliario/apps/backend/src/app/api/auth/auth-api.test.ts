import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { sessionCookieName } from "@/lib/auth/session";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as currentUser, PATCH as updateProfile } from "./me/route";
import { POST as register } from "./register/route";

const databaseUrl = process.env.DATABASE_URL;
const emailPrefix = `auth-test-${Date.now()}`;
const password = "clave-segura-1";

function postRequest(path: string, body: unknown, raw = false): NextRequest {
  return new NextRequest(`http://localhost/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

function meRequest(token?: string): NextRequest {
  return new NextRequest("http://localhost/api/auth/me", {
    headers: token ? { cookie: `${sessionCookieName}=${token}` } : {},
  });
}

/** Cookie de sesión emitida por la respuesta; undefined si no la establece o la deja vacía. */
function sessionCookie(response: Response): { value: string } | undefined {
  const header = response.headers.get("set-cookie") ?? "";
  const value = new RegExp(`${sessionCookieName}=([^;]+)`).exec(header)?.[1];
  return value ? { value } : undefined;
}

type UserBody = { id: string; email: string; name: string; role: string };

describe.skipIf(!databaseUrl)("API REST de autenticación", () => {
  let client: PrismaClient;
  let counter = 0;

  const newEmail = () => `${emailPrefix}-${++counter}@example.com`;

  async function registerUser(email = newEmail()) {
    const response = await register(
      postRequest("register", { name: "Ana Pérez", email, password }),
    );
    return { response, email, body: (await response.json()) as UserBody };
  }

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

  describe("POST /api/auth/register", () => {
    it("crea un USER, responde 201 e inicia sesión con una cookie segura", async () => {
      const { response, email, body } = await registerUser();

      expect(response.status).toBe(201);
      expect(body).toEqual({ id: expect.any(String), email, name: "Ana Pérez", role: "USER" });
      expect(body).not.toHaveProperty("passwordHash");

      const cookie = sessionCookie(response);
      expect(cookie?.value).toBeTruthy();
      const header = response.headers.get("set-cookie") ?? "";
      expect(header).toMatch(/HttpOnly/i);
      expect(header).toMatch(/SameSite=lax/i);
      expect(header).toMatch(/Path=\//i);
      expect(header).toMatch(/Max-Age=\d+/i);
    });

    it("guarda un hash seguro y nunca la contraseña", async () => {
      const { body } = await registerUser();
      const stored = await client.user.findUniqueOrThrow({ where: { id: body.id } });

      expect(stored.passwordHash).not.toContain(password);
      expect(stored.passwordHash.startsWith("scrypt$")).toBe(true);
    });

    it("normaliza el email y rechaza duplicados con 409 sin distinguir mayúsculas", async () => {
      const email = newEmail();
      await registerUser(email);

      const response = await register(
        postRequest("register", { name: "Otra", email: email.toUpperCase(), password }),
      );
      expect(response.status).toBe(409);
      expect(await client.user.count({ where: { email } })).toBe(1);
    });

    it("ignora un rol enviado por el cliente: siempre crea USER", async () => {
      const response = await register(
        postRequest("register", {
          name: "Intruso",
          email: newEmail(),
          password,
          role: "ADMIN",
          isActive: false,
        }),
      );
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(201);
      expect(body.role).toBe("USER");
      const stored = await client.user.findUniqueOrThrow({ where: { id: body.id } });
      expect(stored).toMatchObject({ role: "USER", isActive: true });
    });

    it("responde 400 con los campos inválidos y no crea el usuario", async () => {
      const response = await register(
        postRequest("register", { name: "A", email: "x", password: "corta" }),
      );
      const body = (await response.json()) as { details: { field: string }[] };

      expect(response.status).toBe(400);
      expect(body.details.map((detail) => detail.field).sort()).toEqual([
        "email",
        "name",
        "password",
      ]);
    });

    it("responde 400 si el cuerpo no es JSON", async () => {
      expect((await register(postRequest("register", "{no-json", true))).status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("responde 200 con el usuario y una cookie de sesión", async () => {
      const { email, body: created } = await registerUser();

      const response = await login(postRequest("login", { email, password }));
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body).toMatchObject({ id: created.id, email, role: "USER" });
      expect(sessionCookie(response)?.value).toBeTruthy();
    });

    it("acepta el email con otras mayúsculas", async () => {
      const { email } = await registerUser();
      const response = await login(postRequest("login", { email: email.toUpperCase(), password }));
      expect(response.status).toBe(200);
    });

    it("responde 401 con el mismo mensaje para contraseña incorrecta y email desconocido", async () => {
      const { email } = await registerUser();

      const wrongPassword = await login(postRequest("login", { email, password: "incorrecta-1" }));
      const unknownEmail = await login(
        postRequest("login", { email: newEmail(), password: "incorrecta-1" }),
      );
      const wrongBody = (await wrongPassword.json()) as { message: string };
      const unknownBody = (await unknownEmail.json()) as { message: string };

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongBody.message).toBe(unknownBody.message);
      expect(sessionCookie(wrongPassword)).toBeUndefined();
    });

    it("responde 403 a una cuenta desactivada con la contraseña correcta", async () => {
      const { email, body } = await registerUser();
      await client.user.update({ where: { id: body.id }, data: { isActive: false } });

      const response = await login(postRequest("login", { email, password }));

      expect(response.status).toBe(403);
      expect(sessionCookie(response)).toBeUndefined();
    });

    it("responde 400 con datos inválidos o sin JSON", async () => {
      expect((await login(postRequest("login", { email: "x", password: "" }))).status).toBe(400);
      expect((await login(postRequest("login", "{no-json", true))).status).toBe(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("devuelve el usuario de la sesión iniciada al registrarse", async () => {
      const { response: registered, body } = await registerUser();
      const token = sessionCookie(registered)?.value;

      const response = await currentUser(meRequest(token));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(body);
      expect(response.headers.get("cache-control")).toBe("no-store");
    });

    it("responde 401 sin cookie, con token manipulado o con basura", async () => {
      const { response: registered } = await registerUser();
      const token = sessionCookie(registered)?.value as string;
      const tampered = `${token.slice(0, -4)}AAAA`;

      for (const candidate of [undefined, tampered, "no-es-un-token"]) {
        const response = await currentUser(meRequest(candidate));
        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({ status: 401 });
      }
    });

    it("responde 401 y borra la cookie cuando el usuario fue desactivado o eliminado", async () => {
      const inactive = await registerUser();
      const deleted = await registerUser();
      await client.user.update({ where: { id: inactive.body.id }, data: { isActive: false } });
      await client.user.delete({ where: { id: deleted.body.id } });

      for (const { response: registered } of [inactive, deleted]) {
        const response = await currentUser(meRequest(sessionCookie(registered)?.value));
        expect(response.status).toBe(401);
        expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
      }
    });

    it("refleja de inmediato un cambio de rol hecho en la base", async () => {
      const { response: registered, body } = await registerUser();
      await client.user.update({ where: { id: body.id }, data: { role: "ADMIN" } });

      const response = await currentUser(meRequest(sessionCookie(registered)?.value));

      expect(((await response.json()) as UserBody).role).toBe("ADMIN");
    });
  });

  describe("PATCH /api/auth/me", () => {
    function patchRequest(body: unknown, token?: string): NextRequest {
      return new NextRequest("http://localhost/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { cookie: `${sessionCookieName}=${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
    }

    const patch = (body: unknown, token?: string) =>
      updateProfile(patchRequest(body, token), { params: Promise.resolve({}) });

    async function signedUp() {
      const { response, email, body } = await registerUser();
      return { email, id: body.id, token: sessionCookie(response)?.value as string };
    }

    it("cambia el nombre sin pedir contraseña y responde 200", async () => {
      const { email, id, token } = await signedUp();

      const response = await patch({ name: "  Ana Nueva ", email }, token);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ id, email, name: "Ana Nueva", role: "USER" });
    });

    it("cambia el email con la contraseña actual y deja la sesión vigente", async () => {
      const { id, token } = await signedUp();
      const newMail = newEmail().toUpperCase();

      const response = await patch(
        { name: "Ana Pérez", email: newMail, currentPassword: password },
        token,
      );

      expect(response.status).toBe(200);
      expect(((await response.json()) as UserBody).email).toBe(newMail.toLowerCase());
      const me = await currentUser(meRequest(token));
      expect(((await me.json()) as UserBody).id).toBe(id);
    });

    it("cambia la contraseña: la nueva sirve para iniciar sesión y la vieja ya no", async () => {
      const { email, token } = await signedUp();

      const response = await patch(
        { name: "Ana Pérez", email, currentPassword: password, newPassword: "clave-nueva-123" },
        token,
      );

      expect(response.status).toBe(200);
      const stored = await client.user.findUniqueOrThrow({ where: { email } });
      expect(stored.passwordHash).not.toContain("clave-nueva-123");
      expect(
        (await login(postRequest("login", { email, password: "clave-nueva-123" }))).status,
      ).toBe(200);
      expect((await login(postRequest("login", { email, password }))).status).toBe(401);
    });

    it("responde 403 si falta o es incorrecta la contraseña actual y no cambia nada", async () => {
      const { email, token } = await signedUp();
      const target = newEmail();

      const missing = await patch({ name: "Ana Pérez", email: target }, token);
      const wrong = await patch(
        { name: "Ana Pérez", email: target, currentPassword: "equivocada" },
        token,
      );

      expect(missing.status).toBe(403);
      expect(wrong.status).toBe(403);
      expect(await client.user.findUnique({ where: { email } })).not.toBeNull();
      expect(await client.user.findUnique({ where: { email: target } })).toBeNull();
    });

    it("responde 409 si el email es de otra cuenta", async () => {
      const { token } = await signedUp();
      const { email: takenEmail } = await registerUser();

      const response = await patch(
        { name: "Ana Pérez", email: takenEmail, currentPassword: password },
        token,
      );

      expect(response.status).toBe(409);
    });

    it("ignora role e isActive enviados por el cliente", async () => {
      const { email, id, token } = await signedUp();

      const response = await patch(
        { name: "Ana Pérez", email, role: "ADMIN", isActive: false },
        token,
      );

      expect(response.status).toBe(200);
      const stored = await client.user.findUniqueOrThrow({ where: { id } });
      expect(stored.role).toBe("USER");
      expect(stored.isActive).toBe(true);
    });

    it("responde 401 sin sesión y 400 con datos inválidos", async () => {
      const { email, token } = await signedUp();

      expect((await patch({ name: "Ana Pérez", email })).status).toBe(401);
      const invalid = await patch({ name: "A", email: "x" }, token);
      expect(invalid.status).toBe(400);
      expect(((await invalid.json()) as { details: unknown[] }).details).toHaveLength(2);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("responde 204 y expira la cookie, con o sin sesión previa", async () => {
      const response = await logout();

      expect(response.status).toBe(204);
      const header = response.headers.get("set-cookie") ?? "";
      expect(header).toContain(`${sessionCookieName}=;`);
      expect(header).toMatch(/Max-Age=0/i);
      expect(header).toMatch(/HttpOnly/i);
    });
  });
});

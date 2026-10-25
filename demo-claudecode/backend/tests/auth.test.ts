import { beforeEach, describe, expect, it } from "vitest";
import { AuthService, LOCK_MS, MAX_FAILED_LOGINS, SESSION_TTL_MS, hashToken } from "../src/services/AuthService";
import { SESSION_COOKIE, clearedSessionCookie, readCookie, sessionCookie } from "../src/utils/cookies";
import { ConflictError, UnauthorizedError, ValidationError } from "../src/utils/errors";
import { hashPassword, verifyPassword } from "../src/utils/password";
import { changePasswordSchema, loginBodySchema, newUserSchema } from "../src/validators/auth.validator";
import { FakeAuthRepository } from "./helpers/FakeAuthRepository";
import { FakeInvoiceRepository, sampleData } from "./helpers/FakeInvoiceRepository";

const PASSWORD = "correct horse battery";

describe("password", () => {
  it("hashes with a random salt and verifies", async () => {
    const [a, b] = [await hashPassword(PASSWORD), await hashPassword(PASSWORD)];
    expect(a).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain(PASSWORD);
    expect(await verifyPassword(PASSWORD, a)).toBe(true);
    expect(await verifyPassword("wrong password", a)).toBe(false);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword(PASSWORD, "")).toBe(false);
    expect(await verifyPassword(PASSWORD, "bcrypt$1$2$3$x$y")).toBe(false);
    expect(await verifyPassword(PASSWORD, "scrypt$32768$8$1$AAAA")).toBe(false);
  });
});

describe("cookies", () => {
  it("readCookie finds a cookie among others and tolerates junk", () => {
    expect(readCookie("a=1; session=abc; b=2", "session")).toBe("abc");
    expect(readCookie("xsession=abc", "session")).toBeNull();
    expect(readCookie("session=", "session")).toBeNull();
    expect(readCookie("garbage", "session")).toBeNull();
    expect(readCookie(null, "session")).toBeNull();
  });

  it("sessionCookie is httpOnly, SameSite=Lax and Secure only when asked", () => {
    const dev = sessionCookie("tok", 3600, false);
    expect(dev).toBe(`${SESSION_COOKIE}=tok; Max-Age=3600; Path=/; HttpOnly; SameSite=Lax`);
    expect(sessionCookie("tok", 3600, true)).toMatch(/; Secure$/);
  });

  it("clearedSessionCookie expires immediately", () => {
    expect(clearedSessionCookie(false)).toBe("session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
  });
});

describe("auth validators", () => {
  it("normalises the email and bounds the password", () => {
    expect(loginBodySchema.parse({ email: " Ana@Example.COM ", password: "x" }).email).toBe("ana@example.com");
    expect(loginBodySchema.safeParse({ email: "ana@example.com", password: "" }).success).toBe(false);
    expect(loginBodySchema.safeParse({ email: "ana@example.com", password: "x".repeat(201) }).success).toBe(false);
  });

  it("new accounts need a password of at least 12 characters", () => {
    expect(newUserSchema.safeParse({ email: "ana@example.com", password: "short" }).success).toBe(false);
    expect(newUserSchema.safeParse({ email: "ana@example.com", password: PASSWORD }).success).toBe(true);
    expect(newUserSchema.safeParse({ email: "nope", password: PASSWORD }).success).toBe(false);
  });
});

describe("AuthService", () => {
  const NOW = new Date("2026-10-10T12:00:00Z");
  let t = NOW;
  let repo: FakeAuthRepository;
  let invoices: FakeInvoiceRepository;
  let service: AuthService;
  let counter = 0;

  const setup = async () => {
    t = NOW;
    invoices = new FakeInvoiceRepository();
    repo = new FakeAuthRepository(invoices);
    service = new AuthService(repo, () => t, () => `token-${++counter}`);
    await service.createUser("ana@example.com", PASSWORD);
  };

  it("login creates a session storing only the token hash, valid for 7 days", async () => {
    await setup();
    const result = await service.login("ana@example.com", PASSWORD);
    expect(result.user.email).toBe("ana@example.com");
    expect(result.expiresAt.getTime() - NOW.getTime()).toBe(SESSION_TTL_MS);
    const stored = [...repo.sessions.keys()];
    expect(stored).toEqual([hashToken(result.token)]);
    expect(stored[0]).not.toContain(result.token);
    expect(JSON.stringify(result.user)).not.toMatch(/hash|scrypt/i);
  });

  it("login fails with the same error for a wrong password and an unknown email", async () => {
    await setup();
    const wrong = await service.login("ana@example.com", "wrong password!!").catch((e) => e);
    const unknown = await service.login("nadie@example.com", PASSWORD).catch((e) => e);
    expect(wrong).toBeInstanceOf(UnauthorizedError);
    expect(unknown).toBeInstanceOf(UnauthorizedError);
    expect(wrong.message).toBe(unknown.message);
    expect(repo.sessions.size).toBe(0);
  });

  it("authenticate resolves a valid token and rejects missing, unknown and expired ones", async () => {
    await setup();
    const { token, user } = await service.login("ana@example.com", PASSWORD);
    expect(await service.authenticate(token)).toEqual(user);
    await expect(service.authenticate(null)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(service.authenticate("nope")).rejects.toBeInstanceOf(UnauthorizedError);

    t = new Date(NOW.getTime() + SESSION_TTL_MS);
    await expect(service.authenticate(token)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repo.sessions.size).toBe(0);
  });

  it("logout revokes the session; a null token is a no-op", async () => {
    await setup();
    const { token } = await service.login("ana@example.com", PASSWORD);
    await service.logout(token);
    await expect(service.authenticate(token)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(service.logout(null)).resolves.toBeUndefined();
  });

  it("login sweeps sessions that already expired", async () => {
    await setup();
    await service.login("ana@example.com", PASSWORD);
    t = new Date(NOW.getTime() + SESSION_TTL_MS + 1000);
    await service.login("ana@example.com", PASSWORD);
    expect(repo.sessions.size).toBe(1);
  });

  it("createUser rejects duplicates and the first user claims orphan invoices only", async () => {
    t = NOW;
    invoices = new FakeInvoiceRepository();
    repo = new FakeAuthRepository(invoices);
    service = new AuthService(repo, () => t);
    const orphan = await invoices.create(99, { ...sampleData(), number: "1" });
    invoices.owners.delete(orphan.id);

    const first = await service.createUser("ana@example.com", PASSWORD);
    expect(first.claimedInvoices).toBe(1);
    expect(invoices.owners.get(orphan.id)).toBe(first.user.id);

    const second = await service.createUser("bea@example.com", PASSWORD);
    expect(second.claimedInvoices).toBe(0);
    await expect(service.createUser("ana@example.com", PASSWORD)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("AuthService: bloqueo de cuenta", () => {
  const NOW = new Date("2026-10-10T12:00:00Z");
  let t = NOW;
  let repo: FakeAuthRepository;
  let service: AuthService;
  const bad = (email = "ana@example.com") => service.login(email, "wrong password!!").catch((e) => e);
  const userId = () => repo.users[0].id;

  beforeEach(async () => {
    t = NOW;
    repo = new FakeAuthRepository();
    service = new AuthService(repo, () => t);
    await service.createUser("ana@example.com", PASSWORD);
  });

  it(`tras ${MAX_FAILED_LOGINS} fallos seguidos bloquea la cuenta aunque luego llegue la contraseña correcta`, async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) expect(await bad()).toBeInstanceOf(UnauthorizedError);
    expect(repo.users[0].lockedUntil).toEqual(new Date(NOW.getTime() + LOCK_MS));

    await expect(service.login("ana@example.com", PASSWORD)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repo.sessions.size).toBe(0);
  });

  it("un intento durante el bloqueo no lo alarga ni cuenta como fallo", async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await bad();
    const lockedUntil = repo.users[0].lockedUntil;
    t = new Date(NOW.getTime() + 60_000);
    await bad();
    expect(repo.users[0].lockedUntil).toEqual(lockedUntil);
    expect(repo.failures.get(userId())).toBe(0);
  });

  it("pasado el bloqueo se puede entrar, y los fallos no se arrastran", async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await bad();
    t = new Date(NOW.getTime() + LOCK_MS + 1);
    await expect(service.login("ana@example.com", PASSWORD)).resolves.toMatchObject({ user: { email: "ana@example.com" } });
    expect(repo.users[0].lockedUntil).toBeNull();
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await bad();
    expect(repo.users[0].lockedUntil).toBeNull();
  });

  it("un login correcto reinicia la cuenta de fallos", async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await bad();
    await service.login("ana@example.com", PASSWORD);
    expect(repo.failures.has(userId())).toBe(false);
    await bad();
    expect(repo.users[0].lockedUntil).toBeNull();
  });

  it("la respuesta es idéntica para email desconocido, contraseña errónea y cuenta bloqueada", async () => {
    const unknown = await bad("nadie@example.com");
    const wrong = await bad();
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await bad();
    const locked = await service.login("ana@example.com", PASSWORD).catch((e) => e);
    expect(new Set([unknown.message, wrong.message, locked.message]).size).toBe(1);
    expect(unknown.status).toBe(locked.status);
  });
});

describe("AuthService.changePassword", () => {
  const NOW = new Date("2026-10-10T12:00:00Z");
  const NEW = "another long passphrase";
  let t = NOW;
  let repo: FakeAuthRepository;
  let service: AuthService;
  let counter = 0;

  beforeEach(async () => {
    t = NOW;
    repo = new FakeAuthRepository();
    service = new AuthService(repo, () => t, () => `token-${++counter}`);
    await service.createUser("ana@example.com", PASSWORD);
  });

  it("cambia la contraseña, revoca las demás sesiones y conserva la actual", async () => {
    const mine = await service.login("ana@example.com", PASSWORD);
    const other = await service.login("ana@example.com", PASSWORD);
    const revoked = await service.changePassword(mine.user.id, mine.token, PASSWORD, NEW);
    expect(revoked).toBe(1);
    await expect(service.authenticate(mine.token)).resolves.toEqual(mine.user);
    await expect(service.authenticate(other.token)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(service.login("ana@example.com", PASSWORD)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(service.login("ana@example.com", NEW)).resolves.toBeDefined();
  });

  it("no toca las sesiones de otros usuarios", async () => {
    await service.createUser("bea@example.com", PASSWORD);
    const bea = await service.login("bea@example.com", PASSWORD);
    const ana = await service.login("ana@example.com", PASSWORD);
    await service.changePassword(ana.user.id, ana.token, PASSWORD, NEW);
    await expect(service.authenticate(bea.token)).resolves.toEqual(bea.user);
  });

  it("rechaza una contraseña actual incorrecta con error de campo y la cuenta como fallo", async () => {
    const { user, token } = await service.login("ana@example.com", PASSWORD);
    const error = await service.changePassword(user.id, token, "not my password", NEW).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toEqual([{ field: "currentPassword", message: "La contraseña actual no es correcta" }]);
    expect(repo.failures.get(user.id)).toBe(1);
    await expect(service.login("ana@example.com", PASSWORD)).resolves.toBeDefined();
  });

  it("adivinar la contraseña actual con una sesión robada acaba bloqueando la cuenta", async () => {
    const { user, token } = await service.login("ana@example.com", PASSWORD);
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await service.changePassword(user.id, token, "guess", NEW).catch(() => {});
    expect(repo.users[0].lockedUntil).not.toBeNull();
    await expect(service.changePassword(user.id, token, PASSWORD, NEW)).rejects.toBeInstanceOf(ValidationError);
  });

  it("exige que la nueva sea distinta y no cambia nada si falla", async () => {
    const { user, token } = await service.login("ana@example.com", PASSWORD);
    const before = repo.users[0].passwordHash;
    const error = await service.changePassword(user.id, token, PASSWORD, PASSWORD).catch((e) => e);
    expect(error.details[0].field).toBe("newPassword");
    expect(repo.users[0].passwordHash).toBe(before);
  });

  it("sin sesión o con un usuario inexistente -> 401", async () => {
    await expect(service.changePassword(1, null, PASSWORD, NEW)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(service.changePassword(999, "tok", PASSWORD, NEW)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("el esquema pide al menos 12 caracteres en la nueva", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "short" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: NEW }).success).toBe(true);
  });
});

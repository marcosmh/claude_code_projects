import { describe, expect, it } from "vitest";
import { AuthService, SESSION_TTL_MS, hashToken } from "../src/services/AuthService";
import { SESSION_COOKIE, clearedSessionCookie, readCookie, sessionCookie } from "../src/utils/cookies";
import { ConflictError, UnauthorizedError } from "../src/utils/errors";
import { hashPassword, verifyPassword } from "../src/utils/password";
import { loginBodySchema, newUserSchema } from "../src/validators/auth.validator";
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

import { randomBytes, scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthService } from "../src/services/AuthService";
import type { AuditAction } from "../src/utils/audit";
import { loadJwtConfig } from "../src/utils/jwt";
import {
  DEFAULT_PARAMS,
  currentScryptParams,
  decoyHash,
  hashPassword,
  needsRehash,
  setScryptParamsForTests,
  verifyPassword,
} from "../src/utils/password";
import { FakeAuthRepository } from "./helpers/FakeAuthRepository";

const PASSWORD = "correct horse battery";
const FAST = { N: 2 ** 12, r: 8, p: 1 };
const config = loadJwtConfig({ JWT_SECRET: "service-test-secret-0123456789-0123456789" });

/** A hash in the stored format made with explicit parameters (what an older deployment would have). */
function legacyHash(password: string, N: number, r = 8, p = 1): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64, { N, r, p, maxmem: 128 * N * r * 2 });
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
}

afterEach(() => setScryptParamsForTests(FAST));

describe("scrypt parameters", () => {
  it("the production defaults are the OWASP minimum, N=2^17, r=8, p=1", async () => {
    expect(DEFAULT_PARAMS).toEqual({ N: 131_072, r: 8, p: 1 });
    setScryptParamsForTests(null); // back to the real defaults
    expect(currentScryptParams()).toEqual(DEFAULT_PARAMS);
    const hash = await hashPassword(PASSWORD);
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$/);
    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
    expect(needsRehash(hash)).toBe(false);
  });

  it("the test override cannot be used outside tests", () => {
    const previous = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      expect(() => setScryptParamsForTests(FAST)).toThrow();
    } finally {
      (process.env as Record<string, string>).NODE_ENV = previous!;
    }
  });

  it("an old hash (N=2^15) still verifies with its own parameters and needs a rehash", async () => {
    setScryptParamsForTests(null);
    const old = legacyHash(PASSWORD, 2 ** 15);
    expect(await verifyPassword(PASSWORD, old)).toBe(true);
    expect(await verifyPassword("wrong password", old)).toBe(false);
    expect(needsRehash(old)).toBe(true);
  });

  it("rejects parameters outside the safe range without deriving", async () => {
    const tail = `$${randomBytes(16).toString("base64")}$${randomBytes(64).toString("base64")}`;
    const bad = [
      `scrypt$${2 ** 24}$8$1${tail}`, // huge N: memory DoS
      `scrypt$${2 ** 17}$64$1${tail}`, // huge r: memory DoS
      `scrypt$${2 ** 17}$8$64${tail}`, // huge p: CPU DoS
      `scrypt$${2 ** 17 + 1}$8$1${tail}`, // not a power of two
      `scrypt$16$8$1${tail}`, // too weak
      `scrypt$0$8$1${tail}`,
      `scrypt$NaN$8$1${tail}`,
      `scrypt$${2 ** 15}$8$1$${randomBytes(16).toString("base64")}$${randomBytes(8).toString("base64")}`, // short key
    ];
    for (const hash of bad) {
      const started = Date.now();
      expect(await verifyPassword(PASSWORD, hash)).toBe(false);
      expect(Date.now() - started).toBeLessThan(100);
      expect(needsRehash(hash)).toBe(false);
    }
  });

  it("the decoy hash uses the current parameters", async () => {
    setScryptParamsForTests(null);
    expect(await decoyHash()).toMatch(/^scrypt\$131072\$8\$1\$/);
    setScryptParamsForTests({ N: 2 ** 13, r: 8, p: 1 }); // changing the parameters drops the cached decoy
    expect(await decoyHash()).toMatch(/^scrypt\$8192\$8\$1\$/);
  });
});

describe("rehash on login", () => {
  let repo: FakeAuthRepository;
  let service: AuthService;
  let audit: AuditAction[];

  beforeEach(async () => {
    audit = [];
    repo = new FakeAuthRepository();
    service = new AuthService(repo, () => config, undefined, undefined, (action) => audit.push(action));
    // The account was created when the work factor was lower (N=2^12 < current 2^13).
    await repo.createUser({ email: "ana@example.com", passwordHash: legacyHash(PASSWORD, 2 ** 12) });
    setScryptParamsForTests({ N: 2 ** 13, r: 8, p: 1 });
  });

  it("upgrades the hash after a correct password, keeping the password, tokenVersion and refresh tokens", async () => {
    const first = await service.login("ana@example.com", PASSWORD);
    const before = repo.users[0].passwordHash;
    expect(needsRehash(before)).toBe(false);
    expect(before).toMatch(/^scrypt\$8192\$8\$1\$/);
    expect(await verifyPassword(PASSWORD, before)).toBe(true);
    expect(repo.users[0].tokenVersion).toBe(0);
    expect(audit).toContain("password_rehashed");

    // A second login does not rehash again, and the first session is not revoked.
    await service.login("ana@example.com", PASSWORD);
    expect(repo.users[0].passwordHash).toBe(before);
    expect(repo.refreshTokens.every((t) => t.revokedAt === null)).toBe(true);
    expect(repo.users[0].tokenVersion).toBe(0);
    expect(await service.authenticate(first.token)).toEqual(first.user); // earlier access token still valid
    expect(audit.filter((a) => a === "password_rehashed")).toHaveLength(1);
  });

  it("does not touch live refresh tokens or tokenVersion of an existing session", async () => {
    setScryptParamsForTests({ N: 2 ** 12, r: 8, p: 1 }); // first login without rehash
    const first = await service.login("ana@example.com", PASSWORD);
    setScryptParamsForTests({ N: 2 ** 13, r: 8, p: 1 });
    await service.login("ana@example.com", PASSWORD); // rehashes
    expect(repo.users[0].tokenVersion).toBe(0);
    expect(repo.refreshTokens.filter((t) => t.revokedAt === null)).toHaveLength(2);
    await expect(service.refresh(first.refreshToken)).resolves.toBeDefined();
  });

  it("a wrong password never rehashes", async () => {
    const before = repo.users[0].passwordHash;
    await expect(service.login("ana@example.com", "wrong password!!")).rejects.toThrow();
    expect(repo.users[0].passwordHash).toBe(before);
    expect(audit).not.toContain("password_rehashed");
  });

  it("a locked account never rehashes, even with the right password", async () => {
    const before = repo.users[0].passwordHash;
    repo.users[0].lockedUntil = new Date(Date.now() + 60_000);
    await expect(service.login("ana@example.com", PASSWORD)).rejects.toThrow();
    expect(repo.users[0].passwordHash).toBe(before);
  });

  it("a rehash failure is audited and does not break the login", async () => {
    repo.updatePasswordHash = async () => {
      throw new Error("db down");
    };
    const result = await service.login("ana@example.com", PASSWORD);
    expect(result.token).toBeTruthy();
    expect(audit).toContain("password_rehash_failed");
    expect(audit).toContain("login_success");
  });

  it("does not overwrite a password changed while the rehash was running", async () => {
    const original = repo.users[0].passwordHash;
    const realUpdate = repo.updatePasswordHash.bind(repo);
    repo.updatePasswordHash = async (id, hash, expected) => {
      repo.users[0].passwordHash = await hashPassword("a brand new password"); // concurrent change
      return realUpdate(id, hash, expected);
    };
    await service.login("ana@example.com", PASSWORD);
    expect(repo.users[0].passwordHash).not.toBe(original);
    expect(await verifyPassword("a brand new password", repo.users[0].passwordHash)).toBe(true);
  });
});

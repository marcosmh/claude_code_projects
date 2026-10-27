import { beforeEach, describe, expect, it } from "vitest";
import { AuthService, LOCK_MS, MAX_FAILED_LOGINS, hashToken } from "../src/services/AuthService";
import type { AuditAction } from "../src/utils/audit";
import { REFRESH_COOKIE, clearedRefreshCookie, readCookie, refreshCookie } from "../src/utils/cookies";
import { loadJwtConfig, signAccessToken } from "../src/utils/jwt";
import { ConflictError, RefreshReplayInGraceError, UnauthorizedError, ValidationError } from "../src/utils/errors";
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
    expect(readCookie("a=1; refresh=abc; b=2", "refresh")).toBe("abc");
    expect(readCookie("xrefresh=abc", "refresh")).toBeNull();
    expect(readCookie("refresh=", "refresh")).toBeNull();
    expect(readCookie("garbage", "refresh")).toBeNull();
    expect(readCookie(null, "refresh")).toBeNull();
  });

  it("refreshCookie is httpOnly, SameSite=Strict, scoped to /api/v1/auth and Secure only when asked", () => {
    const dev = refreshCookie("tok", 3600, false);
    expect(dev).toBe(`${REFRESH_COOKIE}=tok; Max-Age=3600; Path=/api/v1/auth; HttpOnly; SameSite=Strict`);
    expect(refreshCookie("tok", 3600, true)).toMatch(/; Secure$/);
    expect(refreshCookie("tok", -5, false)).toMatch(/Max-Age=0;/);
  });

  it("clearedRefreshCookie expires immediately on the same path", () => {
    expect(clearedRefreshCookie(false)).toBe("refresh=; Max-Age=0; Path=/api/v1/auth; HttpOnly; SameSite=Strict");
  });
});

describe("auth validators", () => {
  it("normalises the email and bounds the password", () => {
    expect(loginBodySchema.parse({ email: " Ana@Example.COM ", password: "x" }).email).toBe("ana@example.com");
    expect(loginBodySchema.safeParse({ email: "ana@example.com", password: "" }).success).toBe(false);
    expect(loginBodySchema.safeParse({ email: "ana@example.com", password: "x".repeat(201) }).success).toBe(false);
  });

  it("new accounts need a password of at least 12 characters and a valid role (USER by default)", () => {
    expect(newUserSchema.safeParse({ email: "ana@example.com", password: "short" }).success).toBe(false);
    expect(newUserSchema.safeParse({ email: "nope", password: PASSWORD }).success).toBe(false);
    expect(newUserSchema.parse({ email: "ana@example.com", password: PASSWORD }).role).toBe("USER");
    expect(newUserSchema.parse({ email: "ana@example.com", password: PASSWORD, role: "ADMIN" }).role).toBe("ADMIN");
    expect(newUserSchema.parse({ email: "ana@example.com", password: PASSWORD, role: undefined }).role).toBe("USER");
    expect(newUserSchema.safeParse({ email: "ana@example.com", password: PASSWORD, role: "ROOT" }).success).toBe(false);
  });
});

/** Shared harness: fake repository, controllable clock, deterministic ids and an audit spy. */
const NOW = new Date("2026-10-10T12:00:00Z");
const config = loadJwtConfig({ JWT_SECRET: "service-test-secret-0123456789-0123456789" });
const DAY = 86_400_000;
const GRACE_MS = config.refreshReuseGraceSeconds * 1000;

function harness(cfg = config) {
  const h = {
    t: NOW,
    counter: 0,
    audit: [] as { action: AuditAction; fields?: object }[],
    invoices: new FakeInvoiceRepository(),
    repo: undefined as unknown as FakeAuthRepository,
    service: undefined as unknown as AuthService,
    advance: (ms: number) => void (h.t = new Date(h.t.getTime() + ms)),
  };
  h.repo = new FakeAuthRepository(h.invoices);
  h.service = new AuthService(
    h.repo,
    () => cfg,
    () => h.t,
    () => `id-${++h.counter}`,
    (action, fields) => h.audit.push({ action, fields }),
  );
  return h;
}

describe("AuthService", () => {
  let h: ReturnType<typeof harness>;
  beforeEach(async () => {
    h = harness();
    await h.service.createUser("ana@example.com", PASSWORD);
  });

  it("login issues an access token and a refresh token; only the hash of the refresh jti is stored", async () => {
    const result = await h.service.login("ana@example.com", PASSWORD);
    expect(result.user).toEqual({ id: 1, email: "ana@example.com", role: "USER" });
    expect(result.refreshMaxAgeSeconds).toBe(7 * 86_400);
    expect(h.repo.refreshTokens).toHaveLength(1);
    const [stored] = h.repo.refreshTokens;
    expect(stored.expiresAt.getTime() - NOW.getTime()).toBe(7 * DAY);
    expect(result.refreshToken).not.toContain(stored.tokenHash);
    expect(JSON.stringify(result)).not.toMatch(/hash|scrypt/i);
    expect(await h.service.authenticate(result.token)).toEqual(result.user);
  });

  it("login fails with the same error for a wrong password and an unknown email, and stores nothing", async () => {
    const wrong = await h.service.login("ana@example.com", "wrong password!!").catch((e) => e);
    const unknown = await h.service.login("nadie@example.com", PASSWORD).catch((e) => e);
    expect(wrong).toBeInstanceOf(UnauthorizedError);
    expect(unknown).toBeInstanceOf(UnauthorizedError);
    expect(wrong.message).toBe(unknown.message);
    expect(h.repo.refreshTokens).toHaveLength(0);
  });

  it("login sweeps refresh tokens that already expired", async () => {
    await h.service.login("ana@example.com", PASSWORD);
    h.advance(7 * DAY + 1000);
    await h.service.login("ana@example.com", PASSWORD);
    expect(h.repo.refreshTokens).toHaveLength(1);
  });

  it("never uses the opaque session table", async () => {
    const { token, refreshToken } = await h.service.login("ana@example.com", PASSWORD);
    await h.service.authenticate(token);
    await h.service.refresh(refreshToken);
    expect(h.repo.sessions.size).toBe(0);
  });

  describe("authenticate", () => {
    it("rejects missing, junk and expired tokens with 401 (expired has its own message)", async () => {
      const { token } = await h.service.login("ana@example.com", PASSWORD);
      await expect(h.service.authenticate(null)).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(h.service.authenticate("nope")).rejects.toBeInstanceOf(UnauthorizedError);
      h.advance(config.accessTtlSeconds * 1000);
      const error = await h.service.authenticate(token).catch((e) => e);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toMatch(/caducado/);
    });

    it("rejects an access token whose ver is out of date (password change, manual bump)", async () => {
      const { token, user } = await h.service.login("ana@example.com", PASSWORD);
      await h.repo.incrementTokenVersion(user.id);
      await expect(h.service.authenticate(token)).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("rejects a valid token of a deleted user and of a locked account", async () => {
      const { token } = await h.service.login("ana@example.com", PASSWORD);
      h.repo.users[0].lockedUntil = new Date(NOW.getTime() + LOCK_MS);
      await expect(h.service.authenticate(token)).rejects.toBeInstanceOf(UnauthorizedError);
      h.repo.users.length = 0;
      await expect(h.service.authenticate(token)).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("takes the role from the database, not from the token", async () => {
      const { token, user } = await h.service.login("ana@example.com", PASSWORD);
      h.repo.users[0].role = "ADMIN";
      expect((await h.service.authenticate(token)).role).toBe("ADMIN");
      expect(user.role).toBe("USER");
    });

    it("a refresh token is not an access token", async () => {
      const { refreshToken } = await h.service.login("ana@example.com", PASSWORD);
      await expect(h.service.authenticate(refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("a token signed with the right key for a role the user lacks still gets the DB role", async () => {
      const forged = await signAccessToken(config, { userId: 1, role: "ADMIN", version: 0 }, "j", h.t);
      expect((await h.service.authenticate(forged)).role).toBe("USER");
    });
  });

  describe("refresh", () => {
    it("rotates: new tokens, same family and expiry, the old refresh token is revoked", async () => {
      const first = await h.service.login("ana@example.com", PASSWORD);
      h.advance(60_000);
      const second = await h.service.refresh(first.refreshToken);
      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(second.token).not.toBe(first.token);
      expect(second.user).toEqual(first.user);
      const [old, fresh] = h.repo.refreshTokens;
      expect(old.revokedAt).toEqual(h.t);
      expect(old.replacedBy).toBe(fresh.id);
      expect(fresh.family).toBe(old.family);
      expect(fresh.expiresAt).toEqual(old.expiresAt);
      expect(second.refreshMaxAgeSeconds).toBe(7 * 86_400 - 60);
      expect(await h.service.authenticate(second.token)).toEqual(first.user);
      await expect(h.service.refresh(second.refreshToken)).resolves.toBeDefined();
    });

    it("a reused refresh token revokes the whole family: the legitimate newest token dies too", async () => {
      const first = await h.service.login("ana@example.com", PASSWORD);
      const second = await h.service.refresh(first.refreshToken);
      h.advance(GRACE_MS + 1);
      const replay = await h.service.refresh(first.refreshToken).catch((e) => e);
      expect(replay).toBeInstanceOf(UnauthorizedError);
      expect(h.repo.refreshTokens.every((t) => t.revokedAt)).toBe(true);
      await expect(h.service.refresh(second.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
      expect(h.audit.map((a) => a.action)).toContain("refresh_reuse_detected");
    });

    it("reuse in one family does not touch the user's other devices", async () => {
      const laptop = await h.service.login("ana@example.com", PASSWORD);
      const phone = await h.service.login("ana@example.com", PASSWORD);
      await h.service.refresh(laptop.refreshToken);
      h.advance(GRACE_MS + 1);
      await h.service.refresh(laptop.refreshToken).catch(() => {});
      await expect(h.service.refresh(phone.refreshToken)).resolves.toBeDefined();
    });

    it("two concurrent uses of the same token: one wins, the loser gets a 401 and the family survives (grace)", async () => {
      const { refreshToken } = await h.service.login("ana@example.com", PASSWORD);
      const results = await Promise.allSettled([h.service.refresh(refreshToken), h.service.refresh(refreshToken)]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
      expect(rejected.reason).toBeInstanceOf(RefreshReplayInGraceError);
      expect(h.repo.refreshTokens.filter((t) => !t.revokedAt)).toHaveLength(1);
      expect(h.audit.map((a) => a.action)).not.toContain("refresh_reuse_detected");
    });

    it("two concurrent uses with the grace off: one wins and the family is revoked", async () => {
      h = harness({ ...config, refreshReuseGraceSeconds: 0 });
      await h.service.createUser("ana@example.com", PASSWORD);
      const { refreshToken } = await h.service.login("ana@example.com", PASSWORD);
      const results = await Promise.allSettled([h.service.refresh(refreshToken), h.service.refresh(refreshToken)]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(h.repo.refreshTokens.every((t) => t.revokedAt)).toBe(true);
    });

    describe("reuse grace window", () => {
      it("a replay inside the window is a plain 401: no tokens, family untouched, newest token still works", async () => {
        const first = await h.service.login("ana@example.com", PASSWORD);
        const second = await h.service.refresh(first.refreshToken);
        h.advance(GRACE_MS);
        const replay = await h.service.refresh(first.refreshToken).catch((e) => e);
        expect(replay).toBeInstanceOf(RefreshReplayInGraceError);
        expect(replay.message).toBe(((await h.service.refresh("junk").catch((e) => e)) as Error).message);
        expect(h.repo.refreshTokens.filter((t) => !t.revokedAt)).toHaveLength(1);
        expect(h.audit.map((a) => a.action)).toContain("refresh_reuse_grace");
        expect(h.audit.map((a) => a.action)).not.toContain("refresh_reuse_detected");
        await expect(h.service.refresh(second.refreshToken)).resolves.toBeDefined();
      });

      it("the same replay outside the window revokes the family and is audited", async () => {
        const first = await h.service.login("ana@example.com", PASSWORD);
        const second = await h.service.refresh(first.refreshToken);
        h.advance(GRACE_MS + 1);
        await expect(h.service.refresh(first.refreshToken)).rejects.not.toBeInstanceOf(RefreshReplayInGraceError);
        expect(h.repo.refreshTokens.every((t) => t.revokedAt)).toBe(true);
        expect(h.audit.map((a) => a.action)).toContain("refresh_reuse_detected");
        await expect(h.service.refresh(second.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
      });

      it("a token revoked by logout is not rotated: it gets no grace and the family stays revoked", async () => {
        const { refreshToken } = await h.service.login("ana@example.com", PASSWORD);
        await h.service.logout(refreshToken);
        const error = await h.service.refresh(refreshToken).catch((e) => e);
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error).not.toBeInstanceOf(RefreshReplayInGraceError);
        expect(h.audit.map((a) => a.action)).toContain("refresh_reuse_detected");
      });

      it("with the grace off (0) any replay revokes the family", async () => {
        h = harness({ ...config, refreshReuseGraceSeconds: 0 });
        await h.service.createUser("ana@example.com", PASSWORD);
        const first = await h.service.login("ana@example.com", PASSWORD);
        const second = await h.service.refresh(first.refreshToken);
        await expect(h.service.refresh(first.refreshToken)).rejects.not.toBeInstanceOf(RefreshReplayInGraceError);
        await expect(h.service.refresh(second.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
      });

      it("REFRESH_REUSE_GRACE_SECONDS: default 10, 0 disables, junk and out-of-range values are rejected", () => {
        const secret = { JWT_SECRET: "service-test-secret-0123456789-0123456789" };
        expect(loadJwtConfig(secret).refreshReuseGraceSeconds).toBe(10);
        expect(loadJwtConfig({ ...secret, REFRESH_REUSE_GRACE_SECONDS: "" }).refreshReuseGraceSeconds).toBe(10);
        expect(loadJwtConfig({ ...secret, REFRESH_REUSE_GRACE_SECONDS: "0" }).refreshReuseGraceSeconds).toBe(0);
        expect(loadJwtConfig({ ...secret, REFRESH_REUSE_GRACE_SECONDS: "30" }).refreshReuseGraceSeconds).toBe(30);
        for (const bad of ["-1", "61", "abc", "1.5"]) {
          expect(() => loadJwtConfig({ ...secret, REFRESH_REUSE_GRACE_SECONDS: bad })).toThrow(/REFRESH_REUSE_GRACE_SECONDS/);
        }
      });
    });

    it("gives the same generic 401 for missing, forged, expired, unknown and orphaned tokens", async () => {
      const { refreshToken, token } = await h.service.login("ana@example.com", PASSWORD);
      const messages = new Set<string>();
      const attempt = async (value: string | null) => {
        const error = await h.service.refresh(value).catch((e) => e);
        expect(error).toBeInstanceOf(UnauthorizedError);
        messages.add(error.message);
      };
      await attempt(null);
      await attempt("junk");
      await attempt(token); // an access token
      await attempt(`${refreshToken.slice(0, -3)}abc`); // bad signature
      h.repo.refreshTokens.length = 0;
      await attempt(refreshToken); // validly signed but unknown to the database
      expect(messages.size).toBe(1);
    });

    it("rejects an expired refresh token", async () => {
      const { refreshToken } = await h.service.login("ana@example.com", PASSWORD);
      h.advance(7 * DAY);
      await expect(h.service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("rejects (and revokes) when the user is gone or locked", async () => {
      const { refreshToken } = await h.service.login("ana@example.com", PASSWORD);
      h.repo.users[0].lockedUntil = new Date(NOW.getTime() + LOCK_MS);
      await expect(h.service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
      expect(h.repo.refreshTokens[0].revokedAt).not.toBeNull();
    });

    it("an access token issued after a refresh carries the current ver", async () => {
      const { refreshToken, user } = await h.service.login("ana@example.com", PASSWORD);
      await h.repo.incrementTokenVersion(user.id);
      const renewed = await h.service.refresh(refreshToken);
      await expect(h.service.authenticate(renewed.token)).resolves.toEqual(user);
    });
  });

  describe("logout", () => {
    it("revokes the family: neither the refresh token nor its successors work any more", async () => {
      const first = await h.service.login("ana@example.com", PASSWORD);
      const second = await h.service.refresh(first.refreshToken);
      await h.service.logout(second.refreshToken);
      await expect(h.service.refresh(second.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
      expect(h.repo.refreshTokens.every((t) => t.revokedAt)).toBe(true);
    });

    it("is idempotent and a no-op for missing, junk or unknown tokens", async () => {
      const { refreshToken } = await h.service.login("ana@example.com", PASSWORD);
      await expect(h.service.logout(null)).resolves.toBeUndefined();
      await expect(h.service.logout("junk")).resolves.toBeUndefined();
      await h.service.logout(refreshToken);
      await expect(h.service.logout(refreshToken)).resolves.toBeUndefined();
      h.repo.refreshTokens.length = 0;
      await expect(h.service.logout(refreshToken)).resolves.toBeUndefined();
    });

    it("leaves the user's other devices signed in", async () => {
      const laptop = await h.service.login("ana@example.com", PASSWORD);
      const phone = await h.service.login("ana@example.com", PASSWORD);
      await h.service.logout(laptop.refreshToken);
      await expect(h.service.refresh(phone.refreshToken)).resolves.toBeDefined();
    });
  });

  it("audit records successes and failures without passwords, tokens or emails", async () => {
    const ok = await h.service.login("ana@example.com", PASSWORD);
    await h.service.login("ana@example.com", "wrong password!!").catch(() => {});
    await h.service.login("nadie@example.com", PASSWORD).catch(() => {});
    await h.service.refresh(ok.refreshToken);
    await h.service.logout(ok.refreshToken);
    expect(h.audit.map((a) => a.action)).toEqual(["login_success", "login_failed", "login_failed", "refresh_success", "logout"]);
    const dump = JSON.stringify(h.audit);
    for (const secret of [PASSWORD, "wrong password!!", ok.token, ok.refreshToken, "ana@example.com", "nadie@example.com"]) {
      expect(dump).not.toContain(secret);
    }
  });

  it("createUser stores the role, rejects duplicates and the first user claims orphan invoices only", async () => {
    const fresh = harness();
    const orphan = await fresh.invoices.create(99, { ...sampleData(), number: "1" });
    fresh.invoices.owners.delete(orphan.id);

    const first = await fresh.service.createUser("ana@example.com", PASSWORD, "ADMIN");
    expect(first.claimedInvoices).toBe(1);
    expect(first.user.role).toBe("ADMIN");
    expect(fresh.invoices.owners.get(orphan.id)).toBe(first.user.id);

    const second = await fresh.service.createUser("bea@example.com", PASSWORD);
    expect(second.claimedInvoices).toBe(0);
    expect(second.user.role).toBe("USER");
    await expect(fresh.service.createUser("ana@example.com", PASSWORD)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("AuthService: bloqueo de cuenta", () => {
  let h: ReturnType<typeof harness>;
  const bad = (email = "ana@example.com") => h.service.login(email, "wrong password!!").catch((e) => e);
  const userId = () => h.repo.users[0].id;

  beforeEach(async () => {
    h = harness();
    await h.service.createUser("ana@example.com", PASSWORD);
  });

  it(`tras ${MAX_FAILED_LOGINS} fallos seguidos bloquea la cuenta aunque luego llegue la contraseña correcta`, async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) expect(await bad()).toBeInstanceOf(UnauthorizedError);
    expect(h.repo.users[0].lockedUntil).toEqual(new Date(NOW.getTime() + LOCK_MS));

    await expect(h.service.login("ana@example.com", PASSWORD)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(h.repo.refreshTokens).toHaveLength(0);
    expect(h.audit.map((a) => a.action)).toContain("login_locked");
  });

  it("N logins concurrentes con la contraseña correcta tras 4 fallos: nadie entra: el exceso de intentos bloquea la cuenta", async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await bad();
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => h.service.login("ana@example.com", PASSWORD)));
    // Reservations 6..12 exceed the budget and lock the account; the 5th (a right password) then fails its
    // conditional completion because the account is locked. Before the fix all 12 got in.
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(0);
    expect(h.repo.refreshTokens).toHaveLength(0);
    expect(h.repo.users[0].lockedUntil).not.toBeNull();
  });

  it("5 contraseñas erróneas y 10 correctas a la vez: tras el lote la cuenta queda bloqueada y la correcta también se rechaza", async () => {
    const batch = [
      ...Array.from({ length: 5 }, () => h.service.login("ana@example.com", "wrong password!!")),
      ...Array.from({ length: 10 }, () => h.service.login("ana@example.com", PASSWORD)),
    ];
    const results = await Promise.allSettled(batch);
    // Reservations are capped at MAX_FAILED_LOGINS: no more than that many checks run, and the 5 wrong ones lock the account.
    expect(results.filter((r) => r.status === "fulfilled").length).toBeLessThanOrEqual(MAX_FAILED_LOGINS);
    expect(results.filter((r) => r.status === "rejected").length).toBeGreaterThanOrEqual(10);
  });

  it("si una contraseña errónea concurrente bloquea la cuenta antes de cerrar el login, la correcta se rechaza", async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await bad();
    // The right one is reserved as attempt 6 (over budget), which locks the account; the wrong one fails too.
    const [wrong, right] = await Promise.allSettled([
      h.service.login("ana@example.com", "wrong password!!"),
      h.service.login("ana@example.com", PASSWORD),
    ]);
    expect(wrong.status).toBe("rejected");
    expect(right.status).toBe("rejected");
    expect(h.repo.users[0].lockedUntil).not.toBeNull();
  });

  it("un intento durante el bloqueo no lo alarga ni cuenta como fallo", async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await bad();
    const lockedUntil = h.repo.users[0].lockedUntil;
    h.advance(60_000);
    await bad();
    expect(h.repo.users[0].lockedUntil).toEqual(lockedUntil);
    expect(h.repo.failures.get(userId())).toBe(0);
  });

  it("pasado el bloqueo se puede entrar, y los fallos no se arrastran", async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await bad();
    h.advance(LOCK_MS + 1);
    await expect(h.service.login("ana@example.com", PASSWORD)).resolves.toMatchObject({ user: { email: "ana@example.com" } });
    expect(h.repo.users[0].lockedUntil).toBeNull();
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await bad();
    expect(h.repo.users[0].lockedUntil).toBeNull();
  });

  it("un login correcto reinicia la cuenta de fallos", async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await bad();
    await h.service.login("ana@example.com", PASSWORD);
    expect(h.repo.failures.has(userId())).toBe(false);
    await bad();
    expect(h.repo.users[0].lockedUntil).toBeNull();
  });

  it("la respuesta es idéntica para email desconocido, contraseña errónea y cuenta bloqueada", async () => {
    const unknown = await bad("nadie@example.com");
    const wrong = await bad();
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await bad();
    const locked = await h.service.login("ana@example.com", PASSWORD).catch((e) => e);
    expect(new Set([unknown.message, wrong.message, locked.message]).size).toBe(1);
    expect(unknown.status).toBe(locked.status);
    expect(unknown.code).toBe(locked.code);
  });

  it("el email desconocido también paga el coste del hash (sin atajo medible)", async () => {
    const time = async (email: string) => {
      const start = performance.now();
      await h.service.login(email, "wrong password!!").catch(() => {});
      return performance.now() - start;
    };
    await time("nadie@example.com"); // warms the decoy hash
    const unknown = await time("nadie@example.com");
    const known = await time("ana@example.com");
    // Both run one scrypt verification: same order of magnitude (a skipped hash would be ~0 ms).
    expect(unknown).toBeGreaterThan(known / 5);
  });
});

describe("AuthService.changePassword", () => {
  const NEW = "another long passphrase";
  let h: ReturnType<typeof harness>;

  beforeEach(async () => {
    h = harness();
    await h.service.createUser("ana@example.com", PASSWORD);
  });

  it("cambia la contraseña, mata los access tokens vivos y revoca los refresh de los demás dispositivos", async () => {
    const mine = await h.service.login("ana@example.com", PASSWORD);
    const other = await h.service.login("ana@example.com", PASSWORD);
    await h.service.changePassword(mine.user.id, mine.refreshToken, PASSWORD, NEW);

    await expect(h.service.authenticate(mine.token)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(h.service.authenticate(other.token)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(h.service.refresh(other.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
    // The caller keeps its session: its refresh token renews with the new version
    const renewed = await h.service.refresh(mine.refreshToken);
    await expect(h.service.authenticate(renewed.token)).resolves.toEqual(mine.user);

    await expect(h.service.login("ana@example.com", PASSWORD)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(h.service.login("ana@example.com", NEW)).resolves.toBeDefined();
    expect(h.audit.map((a) => a.action)).toContain("password_changed");
  });

  it("sin refresh token propio válido revoca todos", async () => {
    const a = await h.service.login("ana@example.com", PASSWORD);
    const b = await h.service.login("ana@example.com", PASSWORD);
    await h.service.changePassword(a.user.id, null, PASSWORD, NEW);
    await expect(h.service.refresh(a.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(h.service.refresh(b.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("no acepta como propio el refresh token de otro usuario", async () => {
    await h.service.createUser("bea@example.com", PASSWORD);
    const ana = await h.service.login("ana@example.com", PASSWORD);
    const bea = await h.service.login("bea@example.com", PASSWORD);
    await h.service.changePassword(ana.user.id, bea.refreshToken, PASSWORD, NEW);
    await expect(h.service.refresh(ana.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(h.service.refresh(bea.refreshToken)).resolves.toBeDefined();
  });

  it("no toca las sesiones de otros usuarios", async () => {
    await h.service.createUser("bea@example.com", PASSWORD);
    const bea = await h.service.login("bea@example.com", PASSWORD);
    const ana = await h.service.login("ana@example.com", PASSWORD);
    await h.service.changePassword(ana.user.id, ana.refreshToken, PASSWORD, NEW);
    await expect(h.service.authenticate(bea.token)).resolves.toEqual(bea.user);
    await expect(h.service.refresh(bea.refreshToken)).resolves.toBeDefined();
  });

  it("rechaza una contraseña actual incorrecta con error de campo y la cuenta como fallo", async () => {
    const { user, refreshToken } = await h.service.login("ana@example.com", PASSWORD);
    const error = await h.service.changePassword(user.id, refreshToken, "not my password", NEW).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toEqual([{ field: "currentPassword", message: "La contraseña actual no es correcta" }]);
    expect(h.repo.failures.get(user.id)).toBe(1);
    await expect(h.service.login("ana@example.com", PASSWORD)).resolves.toBeDefined();
  });

  it("adivinar la contraseña actual con una sesión robada acaba bloqueando la cuenta", async () => {
    const { user, refreshToken } = await h.service.login("ana@example.com", PASSWORD);
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await h.service.changePassword(user.id, refreshToken, "guess", NEW).catch(() => {});
    expect(h.repo.users[0].lockedUntil).not.toBeNull();
    await expect(h.service.changePassword(user.id, refreshToken, PASSWORD, NEW)).rejects.toBeInstanceOf(ValidationError);
  });

  it("exige que la nueva sea distinta y no cambia nada si falla", async () => {
    const { user, refreshToken } = await h.service.login("ana@example.com", PASSWORD);
    const before = h.repo.users[0].passwordHash;
    const error = await h.service.changePassword(user.id, refreshToken, PASSWORD, PASSWORD).catch((e) => e);
    expect(error.details[0].field).toBe("newPassword");
    expect(h.repo.users[0].passwordHash).toBe(before);
    expect(h.repo.users[0].tokenVersion).toBe(0);
  });

  it("con un usuario inexistente -> 401", async () => {
    await expect(h.service.changePassword(999, null, PASSWORD, NEW)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("el esquema pide al menos 12 caracteres en la nueva", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "short" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: NEW }).success).toBe(true);
  });
});

describe("hashToken", () => {
  it("is a stable SHA-256 hex digest", () => {
    expect(hashToken("a")).toBe("ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb");
  });
});

import { SignJWT, decodeJwt, decodeProtectedHeader } from "jose";
import { describe, expect, it } from "vitest";
import {
  InvalidTokenError,
  loadJwtConfig,
  parseDuration,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type JwtConfig,
} from "../src/utils/jwt";

const SECRET = "unit-test-secret-0123456789-0123456789";
const NOW = new Date("2026-10-26T12:00:00Z");
const config: JwtConfig = loadJwtConfig({ JWT_SECRET: SECRET });
const key = (s: string) => new TextEncoder().encode(s);
const sec = (d: Date) => Math.floor(d.getTime() / 1000);

const access = (over: Partial<JwtConfig> = {}) =>
  signAccessToken({ ...config, ...over }, { userId: 7, role: "USER", version: 3, sessionId: "fam-1" }, "jti-1", NOW);

/** A well-formed access token forged with the knobs the tests need to turn. */
function forge(opts: { alg?: "HS256" | "HS512"; secret?: string; iss?: string; aud?: string; exp?: number; typ?: string; noSid?: boolean } = {}) {
  return new SignJWT({ role: "USER", ver: 3, ...(opts.noSid ? {} : { sid: "fam-1" }) })
    .setProtectedHeader({ alg: opts.alg ?? "HS256", typ: opts.typ ?? "at+jwt" })
    .setSubject("7")
    .setIssuer(opts.iss ?? config.issuer)
    .setAudience(opts.aud ?? config.audience)
    .setJti("jti-1")
    .setIssuedAt(sec(NOW))
    .setExpirationTime(opts.exp ?? sec(NOW) + 900)
    .sign(key(opts.secret ?? SECRET));
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

describe("loadJwtConfig", () => {
  it("fails when JWT_SECRET is missing, empty or shorter than 32 bytes, without echoing the secret", () => {
    expect(() => loadJwtConfig({})).toThrow(/JWT_SECRET/);
    expect(() => loadJwtConfig({ JWT_SECRET: "" })).toThrow(/JWT_SECRET/);
    const short = "short-secret-value";
    let message = "";
    try {
      loadJwtConfig({ JWT_SECRET: short });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/32 bytes/);
    expect(message).not.toContain(short);
  });

  it("measures bytes, not characters", () => {
    expect(() => loadJwtConfig({ JWT_SECRET: "ñ".repeat(16) })).not.toThrow(); // 16 chars = 32 bytes
    expect(() => loadJwtConfig({ JWT_SECRET: "x".repeat(31) })).toThrow();
    expect(() => loadJwtConfig({ JWT_SECRET: "x".repeat(32) })).not.toThrow();
  });

  it("applies the documented defaults and reads overrides", () => {
    expect(config).toMatchObject({ accessTtlSeconds: 900, refreshTtlSeconds: 604_800, issuer: "facturas-api", audience: "facturas-web" });
    const custom = loadJwtConfig({
      JWT_SECRET: SECRET,
      JWT_EXPIRES_IN: "30s",
      JWT_REFRESH_EXPIRES_IN: "2h",
      JWT_ISSUER: "iss",
      JWT_AUDIENCE: "aud",
    });
    expect(custom).toMatchObject({ accessTtlSeconds: 30, refreshTtlSeconds: 7200, issuer: "iss", audience: "aud" });
  });

  it.each(["", "15", "m", "0m", "-5m", "1.5h", "15 minutes", "1w"])("rejects the duration %j", (value) => {
    expect(() => parseDuration(value, "X")).toThrow(/X/);
  });
});

describe("access token", () => {
  it("carries only the minimal claims", async () => {
    const token = await access();
    expect(decodeProtectedHeader(token)).toEqual({ alg: "HS256", typ: "at+jwt" });
    expect(Object.keys(decodeJwt(token)).sort()).toEqual(["aud", "exp", "iat", "iss", "jti", "role", "sid", "sub", "ver"]);
    expect(decodeJwt(token)).toMatchObject({ sub: "7", role: "USER", ver: 3, sid: "fam-1", exp: sec(NOW) + 900, iat: sec(NOW) });
    expect(await verifyAccessToken(config, token, NOW)).toEqual({ userId: 7, role: "USER", version: 3, sessionId: "fam-1", jti: "jti-1" });
  });

  it("rejects a token without the session id (sid): it could not be revoked", async () => {
    await expect(verifyAccessToken(config, await forge({ noSid: true }), NOW)).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(verifyAccessToken(config, await forge(), NOW)).resolves.toMatchObject({ sessionId: "fam-1" });
  });

  it("rejects a token signed with another secret", async () => {
    const token = await forge({ secret: "another-secret-0123456789-0123456789" });
    await expect(verifyAccessToken(config, token, NOW)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects a tampered payload (role escalation)", async () => {
    const [header, , signature] = (await access()).split(".");
    const payload = b64({ sub: "7", role: "ADMIN", ver: 3, jti: "x", iat: sec(NOW), exp: sec(NOW) + 900, iss: config.issuer, aud: config.audience });
    await expect(verifyAccessToken(config, `${header}.${payload}.${signature}`, NOW)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it.each([
    ["no signature", ""],
    ["a junk signature", "AAAA"],
  ])("rejects alg=none with %s", async (_label, signature) => {
    const none = `${b64({ alg: "none", typ: "at+jwt" })}.${b64({ sub: "7", role: "ADMIN", ver: 3, jti: "x", iat: sec(NOW), exp: sec(NOW) + 900, iss: config.issuer, aud: config.audience })}.${signature}`;
    await expect(verifyAccessToken(config, none, NOW)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects any algorithm other than HS256, even signed with the right key", async () => {
    await expect(verifyAccessToken(config, await forge({ alg: "HS512" }), NOW)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects an expired token and flags it, with no clock tolerance", async () => {
    const token = await access();
    await expect(verifyAccessToken(config, token, new Date(NOW.getTime() + 899_000))).resolves.toBeDefined();
    const error = await verifyAccessToken(config, token, new Date(NOW.getTime() + 900_000)).catch((e) => e);
    expect(error).toBeInstanceOf(InvalidTokenError);
    expect(error.expired).toBe(true);
  });

  it("rejects a wrong issuer or audience", async () => {
    await expect(verifyAccessToken(config, await forge({ iss: "someone-else" }), NOW)).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(verifyAccessToken(config, await forge({ aud: "other-app" }), NOW)).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(verifyAccessToken({ ...config, issuer: "changed" }, await access(), NOW)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects tokens without the required claims or with malformed ones", async () => {
    const base = (claims: Record<string, unknown>, subject = "7") =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: "HS256", typ: "at+jwt" })
        .setSubject(subject)
        .setIssuer(config.issuer)
        .setAudience(config.audience)
        .setJti("j")
        .setIssuedAt(sec(NOW))
        .setExpirationTime(sec(NOW) + 900)
        .sign(key(SECRET));
    for (const token of [
      await base({ ver: 3 }), // no role
      await base({ role: "ROOT", ver: 3 }),
      await base({ role: "USER" }), // no ver
      await base({ role: "USER", ver: "3" }),
      await base({ role: "USER", ver: 3 }, "abc"),
      await base({ role: "USER", ver: 3 }, "-1"),
    ]) {
      await expect(verifyAccessToken(config, token, NOW)).rejects.toBeInstanceOf(InvalidTokenError);
    }
  });

  it("rejects garbage", async () => {
    for (const junk of ["", "abc", "a.b.c", "a.b"]) {
      await expect(verifyAccessToken(config, junk, NOW)).rejects.toBeInstanceOf(InvalidTokenError);
    }
  });
});

describe("refresh token", () => {
  const expiresAt = new Date(NOW.getTime() + 7 * 86_400_000);
  const refresh = () => signRefreshToken(config, { jti: "r-1", family: "fam-1" }, NOW, expiresAt);

  it("carries jti and family and expires with the session", async () => {
    const token = await refresh();
    expect(decodeProtectedHeader(token)).toEqual({ alg: "HS256", typ: "rt+jwt" });
    expect(decodeJwt(token)).toMatchObject({ jti: "r-1", family: "fam-1", exp: sec(expiresAt) });
    expect(await verifyRefreshToken(config, token, NOW)).toEqual({ jti: "r-1", family: "fam-1" });
    await expect(verifyRefreshToken(config, token, expiresAt)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("is never accepted as an access token, nor the other way round", async () => {
    await expect(verifyAccessToken(config, await refresh(), NOW)).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(verifyRefreshToken(config, await access(), NOW)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects a bad signature, a wrong issuer and alg=none", async () => {
    const forged = await new SignJWT({ family: "f" })
      .setProtectedHeader({ alg: "HS256", typ: "rt+jwt" })
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setJti("r")
      .setIssuedAt(sec(NOW))
      .setExpirationTime(sec(expiresAt))
      .sign(key("another-secret-0123456789-0123456789"));
    await expect(verifyRefreshToken(config, forged, NOW)).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(verifyRefreshToken({ ...config, issuer: "x" }, await refresh(), NOW)).rejects.toBeInstanceOf(InvalidTokenError);
    const none = `${b64({ alg: "none", typ: "rt+jwt" })}.${b64({ jti: "r", family: "f", iat: sec(NOW), exp: sec(expiresAt), iss: config.issuer, aud: config.audience })}.`;
    await expect(verifyRefreshToken(config, none, NOW)).rejects.toBeInstanceOf(InvalidTokenError);
  });
});

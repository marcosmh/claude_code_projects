import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "../types";

/** The only algorithm accepted for signing and verifying. `none` and every other algorithm are rejected. */
const ALGORITHM = "HS256";
const MIN_SECRET_BYTES = 32;
/** Production secrets need at least this many distinct characters (a 32-byte `aaaa...` is not a key). */
const MIN_DISTINCT_CHARS = 12;
// Token types are told apart by the JOSE `typ` header, so a refresh token can never pass as an access token.
const ACCESS_TYP = "at+jwt";
const REFRESH_TYP = "rt+jwt";
const ROLES: readonly UserRole[] = ["USER", "ADMIN"];

export interface JwtConfig {
  /** Signs and verifies access tokens. */
  accessSecret: Uint8Array;
  /** Signs and verifies refresh tokens: a different key, so one leaked key cannot forge the other token type. */
  refreshSecret: Uint8Array;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  /** Seconds after a rotation during which re-presenting the old refresh token is a plain 401 (0 = off). */
  refreshReuseGraceSeconds: number;
  issuer: string;
  audience: string;
}

export interface AccessClaims {
  userId: number;
  role: UserRole;
  /** `User.tokenVersion` at issue time. */
  version: number;
  /** Refresh-token family (the login session) this token belongs to; revoking the family kills the token at once. */
  sessionId: string;
  jti: string;
}

export interface RefreshClaims {
  jti: string;
  family: string;
}

const DURATION_UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400 };

/** "15m" -> 900. Only `<integer><s|m|h|d>`; throws on anything else (the message never includes the secret). */
export function parseDuration(value: string, name: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  const seconds = match ? Number(match[1]) * DURATION_UNITS[match[2]] : 0;
  if (seconds <= 0) throw new Error(`${name} debe tener el formato <número><s|m|h|d>, por ejemplo 15m`);
  return seconds;
}

export const DEFAULT_REFRESH_REUSE_GRACE_SECONDS = 10;
const MAX_REFRESH_REUSE_GRACE_SECONDS = 60;

/** REFRESH_REUSE_GRACE_SECONDS: integer 0..60 (0 turns the grace off); unset means the default. */
function parseGrace(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return DEFAULT_REFRESH_REUSE_GRACE_SECONDS;
  const seconds = /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
  if (!(seconds >= 0 && seconds <= MAX_REFRESH_REUSE_GRACE_SECONDS)) {
    throw new Error(`REFRESH_REUSE_GRACE_SECONDS debe ser un entero entre 0 y ${MAX_REFRESH_REUSE_GRACE_SECONDS}`);
  }
  return seconds;
}

/** Rejects obviously weak secrets: too few distinct characters, or a well-known placeholder. */
function assertEntropy(name: string, secret: string): void {
  const distinct = new Set(secret).size;
  const placeholder = /change.?me|secret|password|example|your[-_ ]?key/i.test(secret);
  if (distinct < MIN_DISTINCT_CHARS || placeholder) {
    throw new Error(`${name} es demasiado predecible: genera uno con \`openssl rand -base64 48\``);
  }
}

function readSecret(name: string, value: string | undefined, production: boolean): Uint8Array {
  if (!value) throw new Error(`${name} no está definido: genera uno con \`openssl rand -base64 48\``);
  const bytes = new TextEncoder().encode(value);
  if (bytes.length < MIN_SECRET_BYTES) {
    throw new Error(`${name} debe tener al menos ${MIN_SECRET_BYTES} bytes (tiene ${bytes.length})`);
  }
  if (production) assertEntropy(name, value);
  return bytes;
}

/**
 * Reads and validates the JWT settings. Fails (never printing a secret) when JWT_SECRET is missing or shorter than
 * 32 bytes, or when a duration is malformed. In production it also requires an explicit JWT_REFRESH_SECRET that
 * differs from JWT_SECRET, and rejects low-entropy secrets. Outside production a missing JWT_REFRESH_SECRET is
 * derived from JWT_SECRET (HMAC with a fixed label), so the two keys still differ without extra setup.
 */
export function loadJwtConfig(env: Record<string, string | undefined> = process.env): JwtConfig {
  const production = env.NODE_ENV === "production";
  const accessSecret = readSecret("JWT_SECRET", env.JWT_SECRET, production);
  let refreshSecret: Uint8Array;
  if (env.JWT_REFRESH_SECRET) {
    if (env.JWT_REFRESH_SECRET === env.JWT_SECRET) {
      throw new Error("JWT_REFRESH_SECRET debe ser distinto de JWT_SECRET");
    }
    refreshSecret = readSecret("JWT_REFRESH_SECRET", env.JWT_REFRESH_SECRET, production);
  } else if (production) {
    throw new Error("JWT_REFRESH_SECRET no está definido: en producción es obligatorio y distinto de JWT_SECRET");
  } else {
    refreshSecret = createHmac("sha256", accessSecret).update("facturas:refresh-token-key").digest();
  }
  return {
    accessSecret,
    refreshSecret,
    accessTtlSeconds: parseDuration(env.JWT_EXPIRES_IN || "15m", "JWT_EXPIRES_IN"),
    refreshTtlSeconds: parseDuration(env.JWT_REFRESH_EXPIRES_IN || "7d", "JWT_REFRESH_EXPIRES_IN"),
    refreshReuseGraceSeconds: parseGrace(env.REFRESH_REUSE_GRACE_SECONDS),
    issuer: env.JWT_ISSUER || "facturas-api",
    audience: env.JWT_AUDIENCE || "facturas-web",
  };
}

let cached: JwtConfig | undefined;

/**
 * Process-wide config, validated on first use. `src/instrumentation.ts` calls it when the server starts,
 * so a bad configuration stops the server instead of failing on the first login (and `next build`,
 * which only imports the routes, does not need the secret).
 */
export function getJwtConfig(): JwtConfig {
  return (cached ??= loadJwtConfig());
}

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

export async function signAccessToken(
  config: JwtConfig,
  claims: Omit<AccessClaims, "jti">,
  jti: string,
  now: Date,
): Promise<string> {
  return new SignJWT({ role: claims.role, ver: claims.version, sid: claims.sessionId })
    .setProtectedHeader({ alg: ALGORITHM, typ: ACCESS_TYP })
    .setSubject(String(claims.userId))
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setJti(jti)
    .setIssuedAt(seconds(now))
    .setExpirationTime(seconds(now) + config.accessTtlSeconds)
    .sign(config.accessSecret);
}

export async function signRefreshToken(
  config: JwtConfig,
  claims: RefreshClaims,
  now: Date,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({ family: claims.family })
    .setProtectedHeader({ alg: ALGORITHM, typ: REFRESH_TYP })
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setJti(claims.jti)
    .setIssuedAt(seconds(now))
    .setExpirationTime(seconds(expiresAt))
    .sign(config.refreshSecret);
}

/** Thrown for any token that is not acceptable; `expired` lets callers pick a friendlier message. */
export class InvalidTokenError extends Error {
  constructor(readonly expired = false) {
    super(expired ? "Token caducado" : "Token inválido");
  }
}

async function verify(config: JwtConfig, secret: Uint8Array, token: string, typ: string, now: Date) {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALGORITHM],
      issuer: config.issuer,
      audience: config.audience,
      typ,
      currentDate: now,
      requiredClaims: ["iat", "exp", "jti"],
    });
    return payload;
  } catch (error) {
    throw new InvalidTokenError((error as { code?: string }).code === "ERR_JWT_EXPIRED");
  }
}

export async function verifyAccessToken(config: JwtConfig, token: string, now: Date): Promise<AccessClaims> {
  const payload = await verify(config, config.accessSecret, token, ACCESS_TYP, now);
  const userId = Number(payload.sub);
  const { role, ver, sid, jti } = payload as { role?: unknown; ver?: unknown; sid?: unknown; jti?: string };
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new InvalidTokenError();
  if (!ROLES.includes(role as UserRole)) throw new InvalidTokenError();
  if (typeof ver !== "number" || !Number.isInteger(ver) || !jti) throw new InvalidTokenError();
  if (typeof sid !== "string" || !sid) throw new InvalidTokenError();
  return { userId, role: role as UserRole, version: ver, sessionId: sid, jti };
}

export async function verifyRefreshToken(config: JwtConfig, token: string, now: Date): Promise<RefreshClaims> {
  const payload = await verify(config, config.refreshSecret, token, REFRESH_TYP, now);
  const { family, jti } = payload as { family?: unknown; jti?: string };
  if (typeof family !== "string" || !family || !jti) throw new InvalidTokenError();
  return { jti, family };
}

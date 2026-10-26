import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "../types";

/** The only algorithm accepted for signing and verifying. `none` and every other algorithm are rejected. */
const ALGORITHM = "HS256";
const MIN_SECRET_BYTES = 32;
// Token types are told apart by the JOSE `typ` header, so a refresh token can never pass as an access token.
const ACCESS_TYP = "at+jwt";
const REFRESH_TYP = "rt+jwt";
const ROLES: readonly UserRole[] = ["USER", "ADMIN"];

export interface JwtConfig {
  secret: Uint8Array;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  issuer: string;
  audience: string;
}

export interface AccessClaims {
  userId: number;
  role: UserRole;
  /** `User.tokenVersion` at issue time. */
  version: number;
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

/**
 * Reads and validates the JWT settings. Fails (never printing the secret) when JWT_SECRET is missing or
 * shorter than 32 bytes, or when a duration is malformed.
 */
export function loadJwtConfig(env: Record<string, string | undefined> = process.env): JwtConfig {
  const secret = env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no está definido: genera uno con `openssl rand -base64 48`");
  const bytes = new TextEncoder().encode(secret);
  if (bytes.length < MIN_SECRET_BYTES) {
    throw new Error(`JWT_SECRET debe tener al menos ${MIN_SECRET_BYTES} bytes (tiene ${bytes.length})`);
  }
  return {
    secret: bytes,
    accessTtlSeconds: parseDuration(env.JWT_EXPIRES_IN || "15m", "JWT_EXPIRES_IN"),
    refreshTtlSeconds: parseDuration(env.JWT_REFRESH_EXPIRES_IN || "7d", "JWT_REFRESH_EXPIRES_IN"),
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
  return new SignJWT({ role: claims.role, ver: claims.version })
    .setProtectedHeader({ alg: ALGORITHM, typ: ACCESS_TYP })
    .setSubject(String(claims.userId))
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setJti(jti)
    .setIssuedAt(seconds(now))
    .setExpirationTime(seconds(now) + config.accessTtlSeconds)
    .sign(config.secret);
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
    .sign(config.secret);
}

/** Thrown for any token that is not acceptable; `expired` lets callers pick a friendlier message. */
export class InvalidTokenError extends Error {
  constructor(readonly expired = false) {
    super(expired ? "Token caducado" : "Token inválido");
  }
}

async function verify(config: JwtConfig, token: string, typ: string, now: Date) {
  try {
    const { payload } = await jwtVerify(token, config.secret, {
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
  const payload = await verify(config, token, ACCESS_TYP, now);
  const userId = Number(payload.sub);
  const { role, ver, jti } = payload as { role?: unknown; ver?: unknown; jti?: string };
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new InvalidTokenError();
  if (!ROLES.includes(role as UserRole)) throw new InvalidTokenError();
  if (typeof ver !== "number" || !Number.isInteger(ver) || !jti) throw new InvalidTokenError();
  return { userId, role: role as UserRole, version: ver, jti };
}

export async function verifyRefreshToken(config: JwtConfig, token: string, now: Date): Promise<RefreshClaims> {
  const payload = await verify(config, token, REFRESH_TYP, now);
  const { family, jti } = payload as { family?: unknown; jti?: string };
  if (typeof family !== "string" || !family || !jti) throw new InvalidTokenError();
  return { jti, family };
}

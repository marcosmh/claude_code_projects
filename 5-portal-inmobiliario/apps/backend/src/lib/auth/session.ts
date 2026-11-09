import { jwtVerify, SignJWT } from "jose";

export const sessionCookieName = "portal_session";
export const sessionDurationSeconds = 60 * 60 * 24 * 7;

const MINIMUM_SECRET_LENGTH = 32;
const ALGORITHM = "HS256";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET debe estar definida con al menos ${MINIMUM_SECRET_LENGTH} caracteres`,
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Token de sesión firmado (JWT HS256). Solo lleva el id de usuario: el rol y el estado activo
 * se leen siempre de PostgreSQL, así un cambio de rol o una desactivación tienen efecto inmediato.
 */
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${sessionDurationSeconds}s`)
    .sign(getSecretKey());
}

/** Id del usuario si el token es válido y no ha expirado; null en cualquier otro caso. */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: [ALGORITHM] });
    return typeof payload.sub === "string" && payload.sub !== "" ? payload.sub : null;
  } catch {
    return null;
  }
}

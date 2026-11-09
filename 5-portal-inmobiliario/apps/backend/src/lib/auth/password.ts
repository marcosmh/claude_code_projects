import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt (RFC 7914) con parámetros recomendados por OWASP (N=2^15, r=8, p=1): resistente a GPU
// y sin dependencias nativas. El formato incluye los parámetros para poder subirlos en el futuro.
const COST = 32_768;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MEMORY_LIMIT_BYTES = 128 * COST * BLOCK_SIZE * 2;
const FORMAT_PREFIX = "scrypt";

function deriveKey(
  password: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallelism: number,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      keyLength,
      { N: cost, r: blockSize, p: parallelism, maxmem: MEMORY_LIMIT_BYTES },
      (error, derivedKey) => (error ? reject(error) : resolve(derivedKey)),
    );
  });
}

/** Devuelve `scrypt$N$r$p$sal$hash` (sal y hash en base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt, COST, BLOCK_SIZE, PARALLELISM, KEY_LENGTH);
  return [
    FORMAT_PREFIX,
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

/** Compara en tiempo constante. Un hash mal formado nunca verifica. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [prefix, cost, blockSize, parallelism, encodedSalt, encodedKey] = storedHash.split("$");
  if (prefix !== FORMAT_PREFIX || !encodedSalt || !encodedKey) return false;

  const parameters = [cost, blockSize, parallelism].map(Number);
  if (parameters.some((value) => !Number.isInteger(value) || value <= 0)) return false;
  const [costValue, blockSizeValue, parallelismValue] = parameters as [number, number, number];
  if (costValue !== COST || blockSizeValue !== BLOCK_SIZE || parallelismValue !== PARALLELISM) {
    // Solo se aceptan los parámetros actuales: evita que un hash manipulado agote la memoria.
    return false;
  }

  const expectedKey = Buffer.from(encodedKey, "base64url");
  const derivedKey = await deriveKey(
    password,
    Buffer.from(encodedSalt, "base64url"),
    costValue,
    blockSizeValue,
    parallelismValue,
    expectedKey.length,
  );
  return expectedKey.length === derivedKey.length && timingSafeEqual(expectedKey, derivedKey);
}

let unknownUserHash: Promise<string> | undefined;

/**
 * Gasta el mismo tiempo que una verificación real. Se usa cuando el email no existe para que
 * el tiempo de respuesta no revele qué cuentas están registradas.
 */
export async function spendVerificationTime(password: string): Promise<void> {
  unknownUserHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await unknownUserHash);
}

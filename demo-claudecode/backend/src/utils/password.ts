import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { Semaphore } from "./semaphore";

// scrypt ships with Node (no dependency). Parameters are stored in the hash so they can be raised later.
const PARAMS = { N: 32768, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** `SCRYPT_CONCURRENCY`: derivations running at once (each uses ~32 MiB and a libuv thread). Default 4. */
export function scryptConcurrency(env: string | undefined = process.env.SCRYPT_CONCURRENCY): number {
  const n = Number(env);
  return Number.isInteger(n) && n >= 1 && n <= 64 ? n : 4;
}

const gate = new Semaphore(scryptConcurrency());

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return gate.run(
    () =>
      new Promise<Buffer>((resolve, reject) => {
        // maxmem must cover 128 * N * r bytes; the Node default (32 MiB) is exactly at the limit for N=32768.
        scrypt(password, salt, KEY_LENGTH, { ...options, maxmem: 128 * 1024 * 1024 }, (error, key) =>
          error ? reject(error) : resolve(key),
        );
      }),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

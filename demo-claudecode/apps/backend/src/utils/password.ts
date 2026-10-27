import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { Semaphore } from "./semaphore";

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

// scrypt ships with Node (no dependency). Parameters are stored in the hash so they can be raised later.
// OWASP Password Storage Cheat Sheet minimum: N=2^17 (128 MiB), r=8, p=1.
export const DEFAULT_PARAMS: Readonly<ScryptParams> = Object.freeze({ N: 2 ** 17, r: 8, p: 1 });
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// Range accepted when VERIFYING a stored hash. It covers every hash this app has written (2^15 and 2^17) and
// bounds the work a tampered hash can demand (memory = 128 * N * r bytes, capped at 128 MiB * 2 = 256 MiB).
const MIN_N = 2 ** 12;
const MAX_MEMORY = 256 * 1024 * 1024;
const MAX_R = 16;
const MAX_P = 4;

const isPowerOfTwo = (n: number) => Number.isInteger(n) && n > 1 && (n & (n - 1)) === 0;

/** True when the parameters are sane and cheap enough to derive with (no DoS through a manipulated hash). */
export function isSafeParams({ N, r, p }: ScryptParams): boolean {
  return (
    isPowerOfTwo(N) &&
    N >= MIN_N &&
    Number.isInteger(r) &&
    r >= 1 &&
    r <= MAX_R &&
    Number.isInteger(p) &&
    p >= 1 &&
    p <= MAX_P &&
    128 * N * r <= MAX_MEMORY / 2
  );
}

let current: Readonly<ScryptParams> = DEFAULT_PARAMS;

/**
 * TESTS ONLY: lowers the work factor so the suite stays fast. Refuses to run in production, and the production
 * default is a frozen constant that nothing else can change.
 */
export function setScryptParamsForTests(params: ScryptParams | null): void {
  if (process.env.NODE_ENV !== "test") throw new Error("setScryptParamsForTests is only available in tests");
  if (params && !isSafeParams(params)) throw new Error("unsafe scrypt parameters");
  current = params ?? DEFAULT_PARAMS;
  decoyCache = undefined;
}

/** Parameters new hashes are created with. */
export const currentScryptParams = (): Readonly<ScryptParams> => current;

/** `SCRYPT_CONCURRENCY`: derivations running at once (each uses ~128 MiB and a libuv thread). Default 4. */
export function scryptConcurrency(env: string | undefined = process.env.SCRYPT_CONCURRENCY): number {
  const n = Number(env);
  return Number.isInteger(n) && n >= 1 && n <= 64 ? n : 4;
}

const gate = new Semaphore(scryptConcurrency());

function derive(password: string, salt: Buffer, options: ScryptParams): Promise<Buffer> {
  // maxmem is computed from the (already validated) parameters: 128 * N * r bytes is what scrypt needs; double it.
  const opts: ScryptOptions = { ...options, maxmem: 128 * options.N * options.r * 2 };
  return gate.run(
    () =>
      new Promise<Buffer>((resolve, reject) => {
        scrypt(password, salt, KEY_LENGTH, opts, (error, key) => (error ? reject(error) : resolve(key)));
      }),
  );
}

interface ParsedHash extends ScryptParams {
  salt: Buffer;
  key: Buffer;
}

/** Parses `scrypt$N$r$p$salt$key`. Null if malformed or if the parameters are outside the safe range. */
function parse(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [N, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const salt = Buffer.from(parts[4], "base64");
  const key = Buffer.from(parts[5], "base64");
  if (!isSafeParams({ N, r, p }) || salt.length === 0 || key.length !== KEY_LENGTH) return null;
  return { N, r, p, salt, key };
}

export async function hashPassword(password: string): Promise<string> {
  const params = current;
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, params);
  return ["scrypt", params.N, params.r, params.p, salt.toString("base64"), key.toString("base64")].join("$");
}

/** Verifies with the parameters stored in the hash (old hashes keep working). False for malformed or unsafe hashes. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed) return false;
  const actual = await derive(password, parsed.salt, parsed);
  return timingSafeEqual(actual, parsed.key);
}

/** True when a valid stored hash was made with weaker parameters than the current ones. */
export function needsRehash(stored: string): boolean {
  const parsed = parse(stored);
  return !!parsed && (parsed.N < current.N || parsed.r < current.r || parsed.p < current.p);
}

// Verified when the email is unknown so that a miss costs as much as a real user with an up-to-date hash.
let decoyCache: Promise<string> | undefined;
export function decoyHash(): Promise<string> {
  return (decoyCache ??= hashPassword(randomBytes(16).toString("hex")));
}

import { ConfigError } from "./domain/types.js";

export interface Config {
  connectionString: string;
  /** Prisma's `?schema=` convention; the pg driver does not know it, so it is applied as the search_path. */
  schema: string;
  /** When set, every query is limited to this user's invoices. */
  ownerEmail?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const raw = env.DATABASE_URL?.trim();
  if (!raw) throw new ConfigError("Falta DATABASE_URL: defínela en apps/invoices-mcp/.env (ver .env.example)");

  // The messages never echo the URL: it carries the password.
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError("DATABASE_URL no es una URL válida");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new ConfigError("DATABASE_URL debe ser una cadena PostgreSQL (postgresql://...)");
  }

  const schema = url.searchParams.get("schema") ?? "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(schema)) throw new ConfigError("El schema de DATABASE_URL no es válido");
  url.searchParams.delete("schema");

  const ownerEmail = env.INVOICES_OWNER_EMAIL?.trim().toLowerCase() || undefined;
  return { connectionString: url.toString(), schema, ownerEmail };
}

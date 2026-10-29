import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** `?schema=` is a Prisma convention (used by tests/E2E for throwaway schemas); the pg driver does not know it. */
export function createPrismaClient(url: string): PrismaClient {
  const parsed = new URL(url);
  const schema = parsed.searchParams.get("schema") ?? undefined;
  parsed.searchParams.delete("schema");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: parsed.toString() }, { schema }) });
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  // Unit tests build their own clients (createPrismaClient) and never query this one.
  if (!url && process.env.NODE_ENV !== "test") {
    throw new Error("DATABASE_URL is not set (PostgreSQL connection string, see .env.example)");
  }
  return url ?? "";
}

/** Single shared client (PostgreSQL), built from DATABASE_URL. */
export const prisma = globalForPrisma.prisma ?? createPrismaClient(databaseUrl());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

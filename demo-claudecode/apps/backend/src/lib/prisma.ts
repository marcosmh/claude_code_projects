import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrismaClient(url: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

/** Single shared client. Relative sqlite URLs resolve against the process cwd (run from backend/). */
export const prisma =
  globalForPrisma.prisma ?? createPrismaClient(process.env.DATABASE_URL ?? "file:./prisma/dev.db");

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

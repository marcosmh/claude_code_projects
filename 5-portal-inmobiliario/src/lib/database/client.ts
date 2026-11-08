import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForDatabase = globalThis as unknown as {
  database?: PrismaClient;
};

function createDatabaseClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Se reutiliza el cliente entre recargas en desarrollo para no agotar conexiones.
export const database = globalForDatabase.database ?? createDatabaseClient();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.database = database;
}

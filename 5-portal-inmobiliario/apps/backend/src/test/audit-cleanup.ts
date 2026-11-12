import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Teardown global de Vitest: las pruebas de integración generan entradas de auditoría con
 * cuentas `@example.com`; se borran al terminar para no ensuciar el registro de desarrollo.
 */
export default function setup() {
  return async () => {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // sin .env.local no hay base de datos que limpiar
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return;
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    try {
      await client.auditLog.deleteMany({ where: { actorEmail: { endsWith: "@example.com" } } });
    } finally {
      await client.$disconnect();
    }
  };
}

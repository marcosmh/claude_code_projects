import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export type DatabaseConnectionStatus = {
  databaseName: string;
  serverVersion: string;
};

/** Verifica que PostgreSQL responde. Recibe la URL para poder probarse aislada. */
export async function checkDatabaseConnection(
  connectionString: string,
): Promise<DatabaseConnectionStatus> {
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }),
  });
  try {
    const rows = await client.$queryRaw<
      { database_name: string; server_version: string }[]
    >`SELECT current_database() AS database_name, current_setting('server_version') AS server_version`;
    return {
      databaseName: rows[0].database_name,
      serverVersion: rows[0].server_version,
    };
  } finally {
    await client.$disconnect();
  }
}

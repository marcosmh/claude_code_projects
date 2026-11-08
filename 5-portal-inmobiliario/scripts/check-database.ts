import { checkDatabaseConnection } from "../src/lib/database/check-connection";

async function main(): Promise<void> {
  process.loadEnvFile(".env");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está definida");
  }

  const status = await checkDatabaseConnection(databaseUrl);
  console.log(
    `Conectado a "${status.databaseName}" (PostgreSQL ${status.serverVersion})`,
  );
}

main().catch((error: unknown) => {
  console.error("Falló la conexión:", error instanceof Error ? error.message : error);
  process.exit(1);
});

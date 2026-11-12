import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile(".env.local");
} catch {
  // En CI/producción las variables vienen del entorno.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Las migraciones necesitan una conexión directa o en modo sesión (DIRECT_URL en Supabase);
  // en desarrollo local basta con DATABASE_URL.
  datasource: { url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL") },
});

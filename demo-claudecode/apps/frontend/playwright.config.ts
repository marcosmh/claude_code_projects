import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// The E2E suite runs its own stack, isolated from `start_apps` (4000/5173). Its data lives in a throwaway
// PostgreSQL schema (`e2e`) of the database in apps/backend/.env (DATABASE_URL), never in `public`.
loadEnv({ path: "../backend/.env", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("E2E needs DATABASE_URL (PostgreSQL) in apps/backend/.env");
const e2eDatabaseUrl = new URL(process.env.DATABASE_URL);
e2eDatabaseUrl.searchParams.set("schema", "e2e");
const API_PORT = 4100;
const WEB_PORT = 5174;
const WEB_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // One shared schema: tests reset it, so they cannot run in parallel.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: WEB_URL, locale: "es-ES", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      cwd: "../backend",
      command: "npx tsx prisma/drop-test-schema.ts e2e && npx prisma migrate deploy && npx tsx prisma/create-user.ts e2e@example.com && npx next dev -p " + API_PORT,
      url: `http://localhost:${API_PORT}/api/v1/stats/summary`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: e2eDatabaseUrl.toString(),
        FRONTEND_ORIGIN: WEB_URL,
        NEXT_DIST_DIR: ".next-e2e",
        RATE_LIMIT_DISABLED: "1",
        AUTH_COOKIE_ACCESS: "1", // access token en cookie httpOnly (decisión 6 de backend/docs/jwt-migration.md)
        JWT_SECRET: "e2e-only-secret-not-for-production-0123456789", // desechable: solo firma tokens del e2e
        USER_PASSWORD: "e2e-password-123", // cuenta desechable del schema e2e; debe coincidir con E2E_USER
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      // Mismo origen, como en producción: el navegador solo habla con Vite y este reenvía /api al backend del e2e.
      env: { VITE_API_URL: "/api/v1", VITE_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});

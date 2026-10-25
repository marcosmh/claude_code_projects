import { defineConfig, devices } from "@playwright/test";

// The E2E suite runs its own stack, isolated from `start_apps` (4000/5173) and from prisma/dev.db.
const API_PORT = 4100;
const WEB_PORT = 5174;
const WEB_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // One shared SQLite DB: tests reset it, so they cannot run in parallel.
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
      command: "rm -f prisma/e2e.db prisma/e2e.db-journal && npx prisma migrate deploy && npx tsx prisma/create-user.ts e2e@example.com && npx next dev -p " + API_PORT,
      url: `http://localhost:${API_PORT}/api/v1/stats/summary`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: "file:./prisma/e2e.db",
        FRONTEND_ORIGIN: WEB_URL,
        NEXT_DIST_DIR: ".next-e2e",
        RATE_LIMIT_DISABLED: "1",
        USER_PASSWORD: "e2e-password-123", // cuenta desechable de e2e.db; debe coincidir con E2E_USER
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api/v1` },
    },
  ],
});

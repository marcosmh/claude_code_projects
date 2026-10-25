import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/types/**", "src/main.tsx", "src/vite-env.d.ts"],
      reporter: ["text-summary", "text", "lcov"],
      // Ratchet: floor just under the 2026-10-25 baseline (stmts 34.0, branches 31.1, funcs 28.8, lines 33.8).
      // Target is 85% global; raise these as tests are added, never lower them.
      thresholds: { statements: 30, branches: 28, functions: 25, lines: 30 },
    },
  },
});

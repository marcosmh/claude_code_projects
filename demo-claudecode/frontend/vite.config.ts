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
      // Ratchet: floor just under the 2026-10-25 baseline (stmts 99.0, branches 97.1, funcs 98.7, lines 98.8). Never lower.
      thresholds: { statements: 95, branches: 92, functions: 95, lines: 95 },
    },
  },
});

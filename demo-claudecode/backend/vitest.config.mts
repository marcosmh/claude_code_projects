import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/globalSetup.ts"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/generated/**", "src/types/**", "src/app/**/*.d.ts"],
      reporter: ["text-summary", "text", "lcov"],
      // Ratchet: floor just under the 2026-10-25 baseline (stmts 98.6, branches 92.1, funcs ~99, lines 99.2). Never lower.
      thresholds: { statements: 95, branches: 88, functions: 95, lines: 95 },
    },
  },
});

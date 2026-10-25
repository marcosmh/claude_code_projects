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
      // Floor just under the 2026-10-25 baseline (stmts 93.9, branches 86.2, funcs 96.8, lines 95.1).
      thresholds: { statements: 90, branches: 80, functions: 90, lines: 90 },
    },
  },
});

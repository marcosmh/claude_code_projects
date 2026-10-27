import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Throwaway secret for tests only (>= 32 bytes). Never a real one.
    // TRUSTED_PROXY_HOPS=1: the proxy tests give each case its own X-Forwarded-For (one trusted hop); the tests of the
    // untrusted default (0) stub it.
    env: { JWT_SECRET: "test-only-secret-not-for-production-0123456789", TRUSTED_PROXY_HOPS: "1" },
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

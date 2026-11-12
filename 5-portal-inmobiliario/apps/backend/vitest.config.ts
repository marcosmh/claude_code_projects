import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["src/test/load-env.ts"],
    // scrypt es lento a propósito y las pruebas de integración registran cuentas: con todas las
    // suites en paralelo 5 s no alcanzan y un timeout deja datos de prueba sin limpiar.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

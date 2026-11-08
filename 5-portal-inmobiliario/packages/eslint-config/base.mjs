import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

/** Configuración para paquetes TypeScript sin React ni Next.js. */
export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  globalIgnores(["dist/**", "src/generated/**"]),
]);

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage"] },
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.node },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // stdout belongs to the MCP protocol on the stdio transport: logs go to stderr (console.error) only.
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
);

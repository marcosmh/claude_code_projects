import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { emitSecurityHeaders } from "./build/securityHeaders.ts";

/**
 * CSP estricta del build (el access token vive en localStorage: un XSS lo leería, así que no se permite ningún script
 * inline ni de terceros). Solo `connect-src` depende del entorno: el origen de la API. `frame-ancestors` no
 * funciona en un <meta>: el hosting de producción debe enviar la política completa como cabecera (ver README).
 */
export function buildCsp(apiUrl: string): string {
  // A relative URL (`/api/v1`) means same origin: `'self'` already covers it.
  const apiOrigin = apiUrl.startsWith("/") ? "" : ` ${new URL(apiUrl).origin}`;
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'", // atributos style={{}} de los gráficos y badges
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self'${apiOrigin}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** Inyecta la CSP como <meta> solo en el build: el servidor de desarrollo de Vite necesita scripts inline (HMR). */
function cspMeta(csp: string): Plugin {
  return {
      name: "csp-meta",
      apply: "build",
      transformIndexHtml: () => [
        { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: csp }, injectTo: "head-prepend" },
      ],
    };
  }

  export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    const csp = buildCsp(env.VITE_API_URL ?? "http://localhost:4000/api/v1");
    return {
    plugins: [react(), tailwindcss(), cspMeta(csp), emitSecurityHeaders(csp)],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Same-origin setup (decision 6 of backend/docs/jwt-migration.md): with VITE_API_URL=/api/v1 the browser talks
      // only to this server and `/api` is forwarded to the backend, so no CORS and the cookies stay first-party.
      proxy: { "/api": { target: env.VITE_PROXY_TARGET ?? "http://localhost:4000" } },
    },
    // `npm run preview` sirve el build con la misma política como cabecera (incluye frame-ancestors).
    preview: { headers: { "Content-Security-Policy": csp } },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}", "build/**/*.test.ts"],
      css: false,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}", "build/**/*.ts"],
        exclude: ["src/**/*.test.{ts,tsx}", "build/**/*.test.ts", "src/test/**", "src/types/**", "src/main.tsx", "src/vite-env.d.ts"],
        reporter: ["text-summary", "text", "lcov"],
        // Ratchet: floor just under the 2026-10-25 baseline (stmts 99.0, branches 97.1, funcs 98.7, lines 98.8). Never lower.
        thresholds: { statements: 95, branches: 92, functions: 95, lines: 95 },
      },
    },
};
});

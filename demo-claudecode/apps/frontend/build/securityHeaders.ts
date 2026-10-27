import type { Plugin } from "vite";

/**
 * Cabeceras que el hosting del frontend debe enviar en cada respuesta. La CSP del <meta> no admite
 * `frame-ancestors`, así que la política completa tiene que viajar como cabecera.
 */
export function securityHeaders(csp: string): Record<string, string> {
  return {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    // Los navegadores ignoran HSTS sobre http plano; solo importa detrás de HTTPS.
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  };
}

/** Formato `_headers` (Netlify, Cloudflare Pages). */
export function toHeadersFile(headers: Record<string, string>): string {
  return `/*\n${Object.entries(headers)
    .map(([name, value]) => `  ${name}: ${value}`)
    .join("\n")}\n`;
}

/**
 * Include de nginx. Se repite en cada `location` porque `add_header` en un bloque hijo anula los del padre.
 * `always` las envía también en 4xx/5xx.
 */
export function toNginxInclude(headers: Record<string, string>): string {
  return `${Object.entries(headers)
    .map(([name, value]) => `add_header ${name} "${value.replaceAll('"', '\\"')}" always;`)
    .join("\n")}\n`;
}

/** Emite `_headers` y `security-headers.conf` junto al build, a partir de la misma CSP que el <meta>. */
export function emitSecurityHeaders(csp: string): Plugin {
  return {
    name: "emit-security-headers",
    apply: "build",
    generateBundle() {
      const headers = securityHeaders(csp);
      this.emitFile({ type: "asset", fileName: "_headers", source: toHeadersFile(headers) });
      this.emitFile({ type: "asset", fileName: "security-headers.conf", source: toNginxInclude(headers) });
    },
  };
}

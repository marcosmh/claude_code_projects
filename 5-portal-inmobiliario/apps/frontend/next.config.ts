import path from "node:path";
import type { NextConfig } from "next";

// URL del backend. Se evalúa al construir: debe definirse en el entorno de build.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

// Cabeceras de seguridad de las páginas. No se define una Content-Security-Policy estricta porque
// Next.js inyecta scripts en línea y la aplicación carga Google Maps, Cloudinary y Web3Forms.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@portal/shared-types", "@portal/api-client"],
  // Raíz del monorepo: permite resolver los paquetes del workspace.
  turbopack: {
    root: path.join(__dirname, "../.."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      // Imágenes de ejemplo del seed (se reemplazan por Cloudinary en el Paso 26).
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  // El navegador llama siempre a /api/** del frontend (mismo origen, sin CORS)
  // y Next.js reenvía la petición al backend.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;

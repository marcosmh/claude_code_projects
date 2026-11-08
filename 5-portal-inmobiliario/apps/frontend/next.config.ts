import path from "node:path";
import type { NextConfig } from "next";

// URL del backend. Se evalúa al construir: debe definirse en el entorno de build.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
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

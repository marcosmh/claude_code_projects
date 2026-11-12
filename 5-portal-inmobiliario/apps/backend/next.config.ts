import path from "node:path";
import type { NextConfig } from "next";

// Cabeceras de seguridad de la API: las respuestas JSON no deben interpretarse como otro tipo
// ni embeberse, y no necesitan enviar el referrer.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  transpilePackages: ["@portal/shared-types"],
  // Raíz del monorepo: permite resolver los paquetes del workspace.
  turbopack: { root: path.join(__dirname, "../..") },
};

export default nextConfig;

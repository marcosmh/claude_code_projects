import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo root (two levels up): Turbopack only resolves files inside it, and the shared packages will live there.
  turbopack: { root: path.join(import.meta.dirname, "../..") },
  // E2E runs a second server from this same directory; it needs its own build dir to avoid the dev lock.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // API-only backend. No pages; CORS is handled in src/proxy.ts.
  serverExternalPackages: ["@react-pdf/renderer", "better-sqlite3"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          // frame-ancestors only: a stricter default-src can break the browser's inline PDF viewer.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Browsers ignore HSTS over plain http, so this is harmless on localhost; it only matters behind HTTPS.
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;

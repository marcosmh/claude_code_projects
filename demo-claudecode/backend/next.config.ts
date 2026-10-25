import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API-only backend. No pages; CORS is handled in src/proxy.ts.
  serverExternalPackages: ["@react-pdf/renderer", "better-sqlite3"],
};

export default nextConfig;

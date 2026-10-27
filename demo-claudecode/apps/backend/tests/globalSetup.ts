import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Creates a throwaway SQLite DB (never prisma/dev.db) and applies the migrations.
export default function setup() {
  const dir = mkdtempSync(join(tmpdir(), "invoice-repo-test-"));
  const url = `file:${join(dir, "test.db")}`;
  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  process.env.TEST_DATABASE_URL = url;
  return () => rmSync(dir, { recursive: true, force: true });
}

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import pg from "pg";

// Repository tests run against a throwaway schema (test_<random>) inside the database in DATABASE_URL,
// never against `public`. The schema is created by `prisma migrate deploy` and dropped on teardown.
export default async function setup() {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("Repository tests need DATABASE_URL (PostgreSQL) to create a temporary schema");
  const schema = `test_${randomBytes(6).toString("hex")}`;
  const url = new URL(base);
  url.searchParams.set("schema", schema);
  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "pipe",
  });
  process.env.TEST_DATABASE_URL = url.toString();
  return async () => {
    const client = new pg.Client({ connectionString: base });
    await client.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
  };
}

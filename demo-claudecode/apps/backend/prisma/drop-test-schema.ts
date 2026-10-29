import "dotenv/config";
import pg from "pg";

// Usage: tsx prisma/drop-test-schema.ts <schema>   (E2E: `e2e`). Drops a throwaway schema before `prisma migrate deploy`
// recreates it. Refuses anything that is not `e2e` or `test_*`, so it can never touch `public`.
const schema = process.argv[2];
if (!schema || !/^(e2e|test_[a-z0-9]+)$/.test(schema)) throw new Error(`Refusing to drop schema "${schema}"`);
const base = process.env.DATABASE_URL;
if (!base) throw new Error("DATABASE_URL is not set");
const url = new URL(base);
url.searchParams.delete("schema");

const client = new pg.Client({ connectionString: url.toString() });
client.connect().then(async () => {
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    console.log(`Schema ${schema} dropped`);
  } finally {
    await client.end();
  }
});

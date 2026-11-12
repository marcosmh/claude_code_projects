import { describe, expect, it } from "vitest";
import { checkDatabaseConnection } from "./check-connection";

const databaseUrl = process.env.DATABASE_URL;

describe("checkDatabaseConnection", () => {
  it.skipIf(!databaseUrl)("se conecta a PostgreSQL", async () => {
    const status = await checkDatabaseConnection(databaseUrl as string);
    expect(status.databaseName.length).toBeGreaterThan(0);
    expect(status.serverVersion).toBeTruthy();
  });

  it("falla con una URL inalcanzable", async () => {
    await expect(checkDatabaseConnection("postgresql://x:y@127.0.0.1:1/none")).rejects.toThrow();
  });
});

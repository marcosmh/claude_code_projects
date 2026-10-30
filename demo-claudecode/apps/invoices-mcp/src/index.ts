#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import pg from "pg";
import { loadConfig } from "./config.js";
import { PgInvoiceRepository } from "./repositories/PgInvoiceRepository.js";
import { createServer, SERVER_NAME } from "./server.js";
import { InvoiceService } from "./services/InvoiceService.js";

// stdout carries the MCP protocol: anything we want to say goes to stderr.
try {
  // The package's own .env, wherever the client launches us from (variables already set in the environment win).
  process.loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`${SERVER_NAME}: ${(error as Error).message}`);
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: config.connectionString,
  max: 2,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
});
// An idle connection that the server drops must not crash the process.
pool.on("error", (error) => console.error(`${SERVER_NAME}: conexión inactiva caída: ${error.message}`));

const service = new InvoiceService(new PgInvoiceRepository(pool, config));
const server = createServer(service);
await server.connect(new StdioServerTransport());
console.error(`${SERVER_NAME} listo (stdio)`);

const shutdown = () => {
  void server
    .close()
    .then(() => pool.end())
    .finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

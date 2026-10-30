import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "../src/domain/types.js";
import { escapeLike, PgInvoiceRepository, type PoolLike } from "../src/repositories/PgInvoiceRepository.js";

type Call = { sql: string; params?: unknown[] };

/** A pool whose client records every statement and answers the data query with `rows`. */
function fakePool(rows: unknown[] = [], failOn?: (sql: string) => Error | undefined) {
  const calls: Call[] = [];
  const released = vi.fn();
  const client = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      const error = failOn?.(sql);
      if (error) throw error;
      return { rows: sql.startsWith("SELECT i.") || sql.includes("FROM \"Invoice\"") ? rows : [] };
    }),
    release: released,
  };
  const pool = { connect: vi.fn(async () => client) } as unknown as PoolLike;
  return { pool, calls, released };
}

const dbRow = (over = {}) => ({
  id: 7,
  number: "FAC-0007",
  clientName: "ACME",
  clientEmail: null,
  clientAddress: null,
  issueDate: new Date("2026-09-29T00:00:00Z"),
  dueDate: new Date("2026-11-02T00:00:00Z"),
  status: "SENT",
  taxRate: 16,
  currency: "MXN",
  notes: null,
  items: [{ description: "a", quantity: 1, unitPriceCents: 100 }],
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe("PgInvoiceRepository", () => {
  it("lee dentro de una transacción READ ONLY con el schema y el timeout, y siempre libera la conexión", async () => {
    const { pool, calls, released } = fakePool([dbRow()]);
    const found = await new PgInvoiceRepository(pool, { schema: "scratch_x" }).findById(7);

    expect(calls.map((c) => c.sql.split(/\s/)[0])).toEqual(["BEGIN", "SELECT", "SELECT", "ROLLBACK"]);
    expect(calls[0]?.sql).toBe("BEGIN READ ONLY");
    expect(calls[1]?.params).toEqual(["scratch_x", "10000"]);
    expect(calls[2]?.params).toEqual([null, 7]);
    expect(released).toHaveBeenCalledTimes(1);
    expect(found).toMatchObject({ id: 7, issueDate: "2026-09-29T00:00:00.000Z", dueDate: "2026-11-02T00:00:00.000Z" });
  });

  it("findById devuelve null si no hay fila", async () => {
    expect(await new PgInvoiceRepository(fakePool().pool, { schema: "public" }).findById(1)).toBeNull();
  });

  it("filtra por el dueño cuando hay email y lo pasa como parámetro, nunca dentro del SQL", async () => {
    const { pool, calls } = fakePool([dbRow()]);
    await new PgInvoiceRepository(pool, { schema: "public", ownerEmail: "ana@example.com" }).findById(7);
    const query = calls[2];
    expect(query?.params?.[0]).toBe("ana@example.com");
    expect(query?.sql).toContain(`u.email = $1`);
    expect(query?.sql).not.toContain("ana@example.com");
  });

  it("findByClientName escapa los comodines, pide una fila de más y marca el truncado", async () => {
    const { pool, calls } = fakePool([dbRow({ id: 3 }), dbRow({ id: 2 }), dbRow({ id: 1 })]);
    const result = await new PgInvoiceRepository(pool, { schema: "public" }).findByClientName("50%_off", 2);
    expect(calls[2]?.params).toEqual([null, "%50\\%\\_off%", 3]);
    expect(result.invoices.map((i) => i.id)).toEqual([3, 2]);
    expect(result.truncated).toBe(true);
  });

  it("findByClientName sin exceso no marca truncado", async () => {
    const result = await new PgInvoiceRepository(fakePool([dbRow()]).pool, { schema: "public" }).findByClientName("a", 5);
    expect(result.truncated).toBe(false);
  });

  it("findIssued pasa la moneda (o null) y devuelve las filas tal cual", async () => {
    const data = [{ status: "PAID", currency: "USD", taxRate: 0, items: [] }];
    const { pool, calls } = fakePool(data);
    const repo = new PgInvoiceRepository(pool, { schema: "public" });
    expect(await repo.findIssued("USD")).toEqual(data);
    await repo.findIssued();
    expect(calls[2]?.params).toEqual([null, "USD"]);
    expect(calls[6]?.params).toEqual([null, null]);
  });

  it("un fallo de la consulta se traduce a DatabaseUnavailableError, se registra por stderr y libera la conexión", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { pool, released } = fakePool([], (sql) => (sql.includes('FROM "Invoice"') ? Object.assign(new Error("boom host.example"), { code: "57014" }) : undefined));
    await expect(new PgInvoiceRepository(pool, { schema: "public" }).findById(1)).rejects.toThrow(DatabaseUnavailableError);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("57014"));
    expect(released).toHaveBeenCalledTimes(1);
  });

  it("si no puede conectar, también DatabaseUnavailableError", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const pool = { connect: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) } as unknown as PoolLike;
    await expect(new PgInvoiceRepository(pool, { schema: "public" }).findById(1)).rejects.toThrow(DatabaseUnavailableError);
  });

  it("un ROLLBACK que falla no tapa el resultado", async () => {
    const { pool } = fakePool([dbRow()], (sql) => (sql === "ROLLBACK" ? new Error("closed") : undefined));
    expect(await new PgInvoiceRepository(pool, { schema: "public" }).findById(7)).not.toBeNull();
  });
});

describe("escapeLike", () => {
  it("escapa \\, % y _", () => {
    expect(escapeLike("a\\b%c_d")).toBe("a\\\\b\\%c\\_d");
  });
});

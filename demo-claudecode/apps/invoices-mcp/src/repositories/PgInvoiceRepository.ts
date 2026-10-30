import type { Pool, PoolClient } from "pg";
import { DatabaseUnavailableError, type InvoiceLine, type InvoiceRecord, type InvoiceTotalsRow } from "../domain/types.js";
import type { InvoiceRepository } from "../services/InvoiceRepository.js";

/** The slice of `pg.Pool` we use, so tests can pass a fake. */
export type PoolLike = Pick<Pool, "connect">;

export interface PgOptions {
  schema: string;
  ownerEmail?: string;
}

const STATEMENT_TIMEOUT_MS = 10_000;

// $1 is always the optional owner email: without it the query sees every user's invoices, with it only that user's (an
// unknown email matches nothing). The columns are Prisma's, hence the quoted camelCase names.
const OWNER = `($1::text IS NULL OR i."ownerId" = (SELECT u.id FROM "User" u WHERE u.email = $1))`;

const INVOICE_COLUMNS = `
  i.id, i.number, i."clientName", i."clientEmail", i."clientAddress", i."issueDate", i."dueDate",
  i.status, i."taxRate", i.currency, i.notes,
  COALESCE((
    SELECT json_agg(json_build_object('description', ii.description, 'quantity', ii.quantity, 'unitPriceCents', ii."unitPriceCents") ORDER BY ii.id)
    FROM "InvoiceItem" ii WHERE ii."invoiceId" = i.id
  ), '[]'::json) AS items`;

interface InvoiceRow {
  id: number;
  number: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  issueDate: Date;
  dueDate: Date;
  status: string;
  taxRate: number;
  currency: string;
  notes: string | null;
  items: InvoiceLine[];
}

const toRecord = (row: InvoiceRow): InvoiceRecord => ({
  ...row,
  issueDate: row.issueDate.toISOString(),
  dueDate: row.dueDate.toISOString(),
});

/** `%` and `_` in the user's text are literal characters, not wildcards. */
export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (c) => `\\${c}`);

export class PgInvoiceRepository implements InvoiceRepository {
  constructor(
    private readonly pool: PoolLike,
    private readonly options: PgOptions,
  ) {}

  async findById(id: number): Promise<InvoiceRecord | null> {
    const rows = await this.read<InvoiceRow>(
      `SELECT ${INVOICE_COLUMNS} FROM "Invoice" i WHERE i.id = $2 AND ${OWNER}`,
      [id],
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async findByClientName(name: string, limit: number) {
    const rows = await this.read<InvoiceRow>(
      `SELECT ${INVOICE_COLUMNS} FROM "Invoice" i
       WHERE i."clientName" ILIKE $2 ESCAPE '\\' AND ${OWNER}
       ORDER BY i."issueDate" DESC, i.id DESC LIMIT $3`,
      [`%${escapeLike(name)}%`, limit + 1],
    );
    return { invoices: rows.slice(0, limit).map(toRecord), truncated: rows.length > limit };
  }

  async findIssued(currency?: string): Promise<InvoiceTotalsRow[]> {
    return this.read<InvoiceTotalsRow>(
      `SELECT i.status, i.currency, i."taxRate",
         COALESCE(json_agg(json_build_object('quantity', ii.quantity, 'unitPriceCents', ii."unitPriceCents")) FILTER (WHERE ii.id IS NOT NULL), '[]'::json) AS items
       FROM "Invoice" i LEFT JOIN "InvoiceItem" ii ON ii."invoiceId" = i.id
       WHERE i.status IN ('SENT', 'PAID') AND ($2::text IS NULL OR i.currency = $2) AND ${OWNER}
       GROUP BY i.id`,
      [currency ?? null],
    );
  }

  /**
   * Runs one query in a READ ONLY transaction (the server refuses any write, whatever the SQL) with the schema and a
   * statement timeout applied. The owner email is bound as $1 and `params` follow from $2.
   */
  private async read<T>(sql: string, params: unknown[]): Promise<T[]> {
    let client: PoolClient;
    try {
      client = await this.pool.connect();
    } catch (error) {
      throw unavailable(error);
    }
    try {
      await client.query("BEGIN READ ONLY");
      await client.query("SELECT set_config('search_path', $1, true), set_config('statement_timeout', $2, true)", [
        this.options.schema,
        String(STATEMENT_TIMEOUT_MS),
      ]);
      const result = await client.query(sql, [this.options.ownerEmail ?? null, ...params]);
      return result.rows as T[];
    } catch (error) {
      throw unavailable(error);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  }
}

/** The driver's message can name the host; log what helps and tell the client nothing about the database. */
function unavailable(error: unknown): DatabaseUnavailableError {
  const { code, message } = error as { code?: string; message?: string };
  console.error(`invoices-mcp: error de base de datos${code ? ` (${code})` : ""}: ${message ?? "desconocido"}`);
  return new DatabaseUnavailableError();
}

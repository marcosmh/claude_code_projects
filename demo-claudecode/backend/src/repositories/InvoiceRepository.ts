import type {
  CreateInvoiceInput,
  FindAllInvoicesOptions,
  Invoice,
  InvoiceStatsRow,
  InvoiceStatus,
  PaginatedInvoices,
  StatsRowsOptions,
  UpdateInvoiceInput,
} from "../types";

/**
 * Every method is scoped to `ownerId`: an invoice that belongs to someone else behaves exactly
 * like one that does not exist (null / false), so callers can answer 404 without leaking it.
 */
export interface InvoiceRepository {
  findAll(ownerId: number, options?: FindAllInvoicesOptions): Promise<PaginatedInvoices>;
  findById(ownerId: number, id: number): Promise<Invoice | null>;
  /** Persists the invoice with `input.number` as-is (must be unique). */
  create(ownerId: number, input: CreateInvoiceInput): Promise<Invoice>;
  /**
   * Atomically inserts the invoice with a temporary unique number, then calls
   * `buildNumber(id)` (business rule, supplied by the service) and persists it.
   */
  createWithNumber(
    ownerId: number,
    input: Omit<CreateInvoiceInput, "number">,
    buildNumber: (id: number) => string,
  ): Promise<Invoice>;
  /** Lightweight rows for aggregates: only the fields the totals need, optionally date-bounded. */
  findStatsRows(ownerId: number, options?: StatsRowsOptions): Promise<InvoiceStatsRow[]>;
  /** Replaces all fields and all items. Returns null if the invoice does not exist. */
  update(ownerId: number, id: number, input: UpdateInvoiceInput): Promise<Invoice | null>;
  /**
   * Changes only `status` in a single statement (items and their ids are untouched, no
   * read-modify-write). Returns null if the invoice does not exist.
   */
  updateStatus(ownerId: number, id: number, status: InvoiceStatus): Promise<Invoice | null>;
  /** Returns true if a row was deleted. */
  delete(ownerId: number, id: number): Promise<boolean>;
}

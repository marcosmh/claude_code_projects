import type {
  CreateInvoiceInput,
  FindAllInvoicesOptions,
  Invoice,
  InvoiceStatus,
  PaginatedInvoices,
  UpdateInvoiceInput,
} from "../types";

export interface InvoiceRepository {
  findAll(options?: FindAllInvoicesOptions): Promise<PaginatedInvoices>;
  findById(id: number): Promise<Invoice | null>;
  /** Persists the invoice with `input.number` as-is (must be unique). */
  create(input: CreateInvoiceInput): Promise<Invoice>;
  /**
   * Atomically inserts the invoice with a temporary unique number, then calls
   * `buildNumber(id)` (business rule, supplied by the service) and persists it.
   */
  createWithNumber(
    input: Omit<CreateInvoiceInput, "number">,
    buildNumber: (id: number) => string,
  ): Promise<Invoice>;
  /** Replaces all fields and all items. Returns null if the invoice does not exist. */
  update(id: number, input: UpdateInvoiceInput): Promise<Invoice | null>;
  /**
   * Changes only `status` in a single statement (items and their ids are untouched, no
   * read-modify-write). Returns null if the invoice does not exist.
   */
  updateStatus(id: number, status: InvoiceStatus): Promise<Invoice | null>;
  /** Returns true if a row was deleted. */
  delete(id: number): Promise<boolean>;
}

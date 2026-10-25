import type {
  CreateInvoiceInput,
  FindAllInvoicesOptions,
  Invoice,
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
  /** Returns true if a row was deleted. */
  delete(id: number): Promise<boolean>;
}

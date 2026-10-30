export const CURRENCIES = ["MXN", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

/** An invoice as stored: totals are never stored, they are derived (see `totals.ts`). Dates are ISO strings. */
export interface InvoiceRecord {
  id: number;
  number: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  taxRate: number;
  currency: string;
  notes: string | null;
  items: InvoiceLine[];
}

/** Only what the money totals need. */
export interface InvoiceTotalsRow {
  status: string;
  currency: string;
  taxRate: number;
  items: Pick<InvoiceLine, "quantity" | "unitPriceCents">[];
}

export class InvoiceNotFoundError extends Error {
  constructor(id: number) {
    super(`No existe una factura con id ${id}`);
  }
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("No se pudo consultar la base de datos de facturas");
  }
}

export class ConfigError extends Error {}

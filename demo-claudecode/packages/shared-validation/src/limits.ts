// Input caps keep payloads, PDFs and line totals within safe integer range:
// 100 lines * (1e5 qty * 1e8 cents) stays below Number.MAX_SAFE_INTEGER.
// Single source of truth: the backend enforces them, the frontend forms warn before sending.
export const LIMITS = {
  clientName: 200,
  clientEmail: 254,
  clientAddress: 500,
  notes: 2000,
  description: 500,
  items: 100,
  quantity: 100_000,
  unitPriceCents: 100_000_000,
  taxRate: 100,
  page: 100_000,
} as const;

export const AUTH_LIMITS = { email: 254, passwordMin: 12, passwordMax: 200 } as const;

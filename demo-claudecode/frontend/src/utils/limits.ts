/**
 * Límites de entrada del backend (ver `backend/docs/api.md` y `LIMITS` en
 * `backend/src/validators/invoice.validator.ts`). Se validan aquí para avisar antes de enviar;
 * si cambian en el backend, hay que cambiarlos aquí también.
 */
export const LIMITS = {
  clientName: 200,
  clientEmail: 254,
  clientAddress: 500,
  notes: 2000,
  description: 500,
  items: 100,
  quantity: 100_000,
  /** Precio máximo en unidades de moneda (el backend limita a 100 000 000 centavos). */
  price: 1_000_000,
  taxRate: 100,
} as const;

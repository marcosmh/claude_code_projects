import { LIMITS as SHARED_LIMITS } from "@invoices/shared-validation";

/**
 * Límites de entrada: la fuente única es `@invoices/shared-validation` (el backend los aplica).
 * Aquí se validan solo para avisar antes de enviar; el precio del formulario va en unidades de moneda.
 */
export const LIMITS = {
  ...SHARED_LIMITS,
  /** Precio máximo en unidades de moneda (el backend limita `unitPriceCents`). */
  price: SHARED_LIMITS.unitPriceCents / 100,
} as const;

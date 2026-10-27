import { calcTotals, type LineItem } from "@invoices/shared-utils";

/**
 * Vista previa informativa de totales dentro del formulario.
 * El backend es la autoridad: los valores guardados vienen en `subtotalCents`,
 * `taxCents` y `totalCents`. La regla de cálculo es la misma (`@invoices/shared-utils`).
 * Nunca usar esto fuera del formulario.
 */
export type PreviewLine = LineItem;

export const previewTotals = (lines: PreviewLine[], taxRate: number) => calcTotals(lines, taxRate);

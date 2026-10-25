/**
 * Vista previa informativa de totales dentro del formulario.
 * El backend es la autoridad: los valores guardados vienen en `subtotalCents`,
 * `taxCents` y `totalCents`. Nunca usar esto fuera del formulario.
 */
export interface PreviewLine {
  quantity: number;
  unitPriceCents: number;
}

export function previewTotals(lines: PreviewLine[], taxRate: number) {
  const subtotalCents = lines.reduce((sum, l) => sum + Math.round(l.quantity * l.unitPriceCents), 0);
  const taxCents = Math.round((subtotalCents * taxRate) / 100);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

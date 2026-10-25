/**
 * Vista previa informativa de totales dentro del formulario.
 * El backend es la autoridad: los valores guardados vienen en `subtotalCents`,
 * `taxCents` y `totalCents`. Nunca usar esto fuera del formulario.
 */
export interface PreviewLine {
  quantity: number;
  unitPriceCents: number;
}

/** Misma regla que el backend (`roundCents`): medio centavo hacia arriba, sin ruido de coma flotante. */
const roundCents = (value: number) => Math.round(Number(value.toPrecision(15)));

export function previewTotals(lines: PreviewLine[], taxRate: number) {
  const subtotalCents = lines.reduce((sum, l) => sum + roundCents(l.quantity * l.unitPriceCents), 0);
  const taxCents = roundCents((subtotalCents * taxRate) / 100);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export type LineItem = { quantity: number; unitPriceCents: number };

export function calcTotals(items: LineItem[], taxRate: number) {
  const subtotalCents = items.reduce(
    (sum, i) => sum + Math.round(i.quantity * i.unitPriceCents),
    0,
  );
  const taxCents = Math.round((subtotalCents * taxRate) / 100);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

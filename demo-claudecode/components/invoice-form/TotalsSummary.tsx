import { formatMoney } from "@/lib/format";
import type { calcTotals } from "@/lib/totals";

export function TotalsSummary({ totals }: { totals: ReturnType<typeof calcTotals> }) {
  return (
    <dl className="ml-auto w-64 space-y-1 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(totals.subtotalCents)}</dd></div>
      <div className="flex justify-between"><dt>Impuesto</dt><dd>{formatMoney(totals.taxCents)}</dd></div>
      <div className="flex justify-between border-t pt-1 font-semibold"><dt>Total</dt><dd>{formatMoney(totals.totalCents)}</dd></div>
    </dl>
  );
}

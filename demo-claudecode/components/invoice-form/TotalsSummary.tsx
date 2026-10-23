import { formatMoney } from "@/lib/format";
import { money } from "@/components/ui";
import type { calcTotals } from "@/lib/totals";

export function TotalsSummary({ totals }: { totals: ReturnType<typeof calcTotals> }) {
  return (
    <dl className="ml-auto w-full max-w-xs space-y-1.5 text-sm tabular-nums">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(totals.subtotalCents)}</dd></div>
      <div className="flex justify-between"><dt>Impuesto</dt><dd>{formatMoney(totals.taxCents)}</dd></div>
      <div className="flex items-baseline justify-between border-t border-zinc-200 pt-2"><dt className="font-semibold">Total</dt><dd className={`${money} text-2xl font-semibold text-brand`}>{formatMoney(totals.totalCents)}</dd></div>
    </dl>
  );
}

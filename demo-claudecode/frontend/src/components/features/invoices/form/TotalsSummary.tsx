import { formatMoney } from "@/utils/format";
import { money } from "@/components/common/ui";

interface Totals {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

/** Totales informativos: el backend recalcula y es la autoridad. */
export function TotalsSummary({ totals }: { totals: Totals }) {
  return (
    <dl className="ml-auto w-full max-w-xs space-y-1.5 text-sm tabular-nums" aria-label="Vista previa de totales">
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd>{formatMoney(totals.subtotalCents)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Impuesto</dt>
        <dd>{formatMoney(totals.taxCents)}</dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-zinc-200 pt-2">
        <dt className="font-semibold">Total</dt>
        <dd className={`${money} text-2xl font-semibold text-brand`}>{formatMoney(totals.totalCents)}</dd>
      </div>
    </dl>
  );
}

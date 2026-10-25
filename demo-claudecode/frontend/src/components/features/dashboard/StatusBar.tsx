import { useState } from "react";
import type { StatsSummary } from "@/types/stats";
import { formatMoney } from "@/utils/format";
import { STATUS_COLOR, STATUS_LABELS, STATUSES } from "@/utils/status";
import { DataTable } from "./DataTable";

export function StatusBar({ summary }: { summary: StatsSummary["byStatus"] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = STATUSES.reduce((n, s) => n + summary[s].count, 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  if (total === 0) return <p className="text-sm text-zinc-500">Aún no hay facturas.</p>;

  const visible = STATUSES.map((s, i) => ({ s, i })).filter(({ s }) => summary[s].count > 0);
  const hovered = active === null ? null : STATUSES[active];

  return (
    <div>
      <div className="relative">
        <div className="flex h-6 gap-0.5" role="group" aria-label="Facturas por estado">
          {visible.map(({ s, i }) => (
            <div
              key={s}
              role="img"
              tabIndex={0}
              aria-label={`${STATUS_LABELS[s]}: ${summary[s].count} (${pct(summary[s].count)}%)`}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="min-w-1.5 rounded outline-offset-2 transition-opacity"
              style={{
                flexGrow: summary[s].count,
                background: STATUS_COLOR[s],
                opacity: active === null || active === i ? 1 : 0.55,
              }}
            />
          ))}
        </div>
        {hovered && (
          <div className="pointer-events-none absolute -top-14 left-0 z-10 rounded-md border border-zinc-300 bg-surface px-3 py-2 text-xs shadow-sm">
            <p className="text-base font-semibold leading-tight tabular-nums">{summary[hovered].count} facturas</p>
            <p className="text-zinc-500">
              {STATUS_LABELS[hovered]} · {formatMoney(summary[hovered].totalCents)}
            </p>
          </div>
        )}
      </div>

      <ul className="mt-4 grid gap-y-2 text-sm">
        {STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
            <span className="text-zinc-600">{STATUS_LABELS[s]}</span>
            <span className="ml-auto font-semibold tabular-nums">{summary[s].count}</span>
            <span className="w-9 text-right text-zinc-500 tabular-nums">{pct(summary[s].count)}%</span>
          </li>
        ))}
      </ul>

      <DataTable
        columns={["Estado", "Facturas", "Importe"]}
        rows={STATUSES.map((s) => [STATUS_LABELS[s], summary[s].count, formatMoney(summary[s].totalCents)])}
      />
    </div>
  );
}

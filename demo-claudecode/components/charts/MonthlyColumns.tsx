"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { STATUS_COLOR, STATUS_LABELS, STATUSES, type MonthBucket, type Status } from "@/lib/stats";
import { DataTable } from "./DataTable";

const W = 640;
const H = 260;
const M = { top: 12, right: 8, bottom: 28, left: 44 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const MAX_BAR = 24;
const GAP = 2;
const TICKS = 4;

// De abajo hacia arriba: lo cobrado queda como base del apilado.
const STACK: Status[] = ["PAID", "SENT", "DRAFT"];

function niceMax(max: number) {
  if (max <= 0) return 1000;
  const raw = max / TICKS;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return step * TICKS;
}

const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });

function roundedTop(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function MonthlyColumns({ months }: { months: MonthBucket[] }) {
  const [active, setActive] = useState<number | null>(null);

  const monthTotal = (m: MonthBucket) => STACK.reduce((n, s) => n + m.totalsCents[s], 0);
  const max = niceMax(Math.max(0, ...months.map(monthTotal)) / 100);
  const band = PLOT_W / months.length;
  const barW = Math.min(MAX_BAR, band * 0.5);
  const y = (v: number) => M.top + PLOT_H - (v / max) * PLOT_H;
  const hovered = active === null ? null : months[active];
  const empty = months.every((m) => monthTotal(m) === 0);

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Importe facturado por mes y estado">
          {Array.from({ length: TICKS + 1 }, (_, i) => {
            const v = (max / TICKS) * i;
            return (
              <g key={i}>
                <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="stroke-zinc-200" strokeWidth={1} />
                <text x={M.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-zinc-500 text-[11px]">
                  {compact.format(v)}
                </text>
              </g>
            );
          })}

          {months.map((m, i) => {
            const cx = M.left + band * i + band / 2;
            const x = cx - barW / 2;
            const present = STACK.filter((s) => m.totalsCents[s] > 0);
            let cursor = M.top + PLOT_H;
            return (
              <g key={m.key}>
                {active === i && (
                  <rect x={M.left + band * i} y={M.top} width={band} height={PLOT_H} className="fill-zinc-100" />
                )}
                {present.map((s, k) => {
                  const h = Math.max(3, (m.totalsCents[s] / 100 / max) * PLOT_H);
                  const top = cursor - h;
                  const drawn = k === present.length - 1 ? h : h - GAP;
                  cursor = top;
                  return k === present.length - 1 ? (
                    <path key={s} d={roundedTop(x, top, barW, drawn)} style={{ fill: STATUS_COLOR[s] }} />
                  ) : (
                    <rect key={s} x={x} y={top + GAP} width={barW} height={drawn} style={{ fill: STATUS_COLOR[s] }} />
                  );
                })}
                <text x={cx} y={H - 8} textAnchor="middle" className="fill-zinc-500 text-[11px]">
                  {m.label}
                </text>
                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={PLOT_H + M.bottom}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${m.title}: ${formatMoney(monthTotal(m))}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="outline-none focus-visible:stroke-zinc-500"
                />
              </g>
            );
          })}
          <line x1={M.left} x2={W - M.right} y1={M.top + PLOT_H} y2={M.top + PLOT_H} className="stroke-zinc-300" strokeWidth={1} />
        </svg>

        {hovered && active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-48 -translate-x-1/2 rounded-md border border-zinc-300 bg-surface px-3 py-2 text-xs shadow-sm"
            style={{ left: `${Math.min(80, Math.max(20, ((M.left + band * active + band / 2) / W) * 100))}%` }}
          >
            <p className="mb-1 capitalize text-zinc-500">{hovered.title}</p>
            <p className="mb-1.5 text-base font-semibold leading-tight tabular-nums">{formatMoney(monthTotal(hovered))}</p>
            {STATUSES.map((s) => (
              <p key={s} className="flex items-center gap-2 py-0.5">
                <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: STATUS_COLOR[s] }} />
                <span className="text-zinc-500">{STATUS_LABELS[s]}</span>
                <span className="ml-auto font-medium tabular-nums">{formatMoney(hovered.totalsCents[s])}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {empty && <p className="text-center text-sm text-zinc-500">Sin facturas en los últimos {months.length} meses.</p>}

      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2 text-zinc-600">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABELS[s]}
          </li>
        ))}
      </ul>

      <DataTable
        columns={["Mes", ...STATUSES.map((s) => STATUS_LABELS[s]), "Total"]}
        rows={months.map((m) => [
          m.title,
          ...STATUSES.map((s) => formatMoney(m.totalsCents[s])),
          formatMoney(monthTotal(m)),
        ])}
      />
    </div>
  );
}

import type { ReactNode } from "react";

const numberFormatter = new Intl.NumberFormat("es-MX");
const percentFormatter = new Intl.NumberFormat("es-MX", {
  style: "percent",
  maximumFractionDigits: 0,
});

export type BarListItem = { id: string; label: string; value: number };

/**
 * Lista de barras horizontales. El valor numérico (y su porcentaje) siempre está escrito, así que
 * la barra es solo un apoyo visual y no depende del color.
 */
export function BarList({ items, emptyText }: { items: BarListItem[]; emptyText: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const maximum = Math.max(1, ...items.map((item) => item.value));

  if (items.length === 0 || total === 0) {
    return <p className="text-sm text-foreground/70">{emptyText}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {numberFormatter.format(item.value)}{" "}
              <span className="font-normal text-foreground/60">
                ({percentFormatter.format(item.value / total)})
              </span>
            </span>
          </div>
          <div
            aria-hidden="true"
            className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/10"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(2, Math.round((item.value / maximum) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export type MonthlySeries = { id: string; label: string; values: number[]; className: string };

/**
 * Columnas agrupadas por mes. Se acompaña de una tabla con los números, que es lo que leen los
 * lectores de pantalla; las columnas son decorativas (`aria-hidden`).
 */
export function MonthlyChart({ months, series }: { months: string[]; series: MonthlySeries[] }) {
  const maximum = Math.max(1, ...series.flatMap((entry) => entry.values));

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-sm" aria-hidden="true">
        {series.map((entry) => (
          <span key={entry.id} className="inline-flex items-center gap-2">
            <span className={`inline-block size-3 rounded-sm ${entry.className}`} />
            {entry.label}
          </span>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="mt-4 grid h-44 items-end gap-2"
        style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
      >
        {months.map((month, monthIndex) => (
          <div key={month} className="flex h-full items-end justify-center gap-1">
            {series.map((entry) => (
              <div
                key={entry.id}
                className={`w-full max-w-5 rounded-t ${entry.className}`}
                style={{
                  height: `${Math.max(entry.values[monthIndex] > 0 ? 4 : 1, (entry.values[monthIndex] / maximum) * 100)}%`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <caption className="sr-only">Actividad de los últimos meses</caption>
          <thead>
            <tr className="border-b border-foreground/15 text-left">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Mes
              </th>
              {series.map((entry) => (
                <th key={entry.id} scope="col" className="px-3 py-2 text-right font-semibold">
                  {entry.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((month, monthIndex) => (
              <tr key={month} className="border-b border-foreground/10">
                <th scope="row" className="py-2 pr-3 text-left font-normal capitalize">
                  {month}
                </th>
                {series.map((entry) => (
                  <td key={entry.id} className="px-3 py-2 text-right tabular-nums">
                    {numberFormatter.format(entry.values[monthIndex])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tarjeta de una sección de reportes. */
export function ReportCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-xl border border-foreground/10 bg-surface p-5 shadow-sm"
    >
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

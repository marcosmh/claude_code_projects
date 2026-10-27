import { calcTotals, type LineItem } from "@/lib/totals";
import { STATUS_LABELS, STATUSES } from "@/lib/validators";

export type Status = (typeof STATUSES)[number];

// El color sigue a la entidad (estado), no a su posición: mismo color en badges y gráficos.
export const STATUS_COLOR: Record<Status, string> = {
  DRAFT: "var(--series-1)",
  SENT: "var(--series-2)",
  PAID: "var(--series-3)",
};

export type InvoiceLike = {
  status: string;
  issueDate: Date;
  dueDate: Date;
  taxRate: number;
  items: LineItem[];
};

export type StatusSummary = Record<Status, { count: number; totalCents: number }>;

/** "Vencida" no es un estado: es una factura enviada cuya fecha de vencimiento ya pasó. */
export function isOverdue(inv: { status: string; dueDate: Date }, now: Date) {
  return inv.status === "SENT" && inv.dueDate < now;
}

export function summarize(invoices: InvoiceLike[], now: Date) {
  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s, { count: 0, totalCents: 0 }]),
  ) as StatusSummary;
  const overdue = { count: 0, totalCents: 0 };

  for (const inv of invoices) {
    if (!(inv.status in byStatus)) continue;
    const { totalCents } = calcTotals(inv.items, inv.taxRate);
    const bucket = byStatus[inv.status as Status];
    bucket.count += 1;
    bucket.totalCents += totalCents;
    if (isOverdue(inv, now)) {
      overdue.count += 1;
      overdue.totalCents += totalCents;
    }
  }
  return { byStatus, overdue, totalCount: invoices.length };
}

export type MonthBucket = {
  key: string;
  label: string;
  title: string;
  totalsCents: Record<Status, number>;
};

export function monthlyTotals(invoices: InvoiceLike[], now: Date, months = 6): MonthBucket[] {
  const short = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
  const long = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
  const keyOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
    return {
      key: keyOf(d),
      label: short.format(d).replace(".", ""),
      title: long.format(d),
      totalsCents: { DRAFT: 0, SENT: 0, PAID: 0 } as Record<Status, number>,
    };
  });
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const inv of invoices) {
    const bucket = byKey.get(keyOf(inv.issueDate));
    if (!bucket || !(inv.status in bucket.totalsCents)) continue;
    bucket.totalsCents[inv.status as Status] += calcTotals(inv.items, inv.taxRate).totalCents;
  }
  return buckets;
}

export { STATUS_LABELS, STATUSES };

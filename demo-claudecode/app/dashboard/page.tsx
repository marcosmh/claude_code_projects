import Link from "next/link";
import { connection } from "next/server";
import { MonthlyColumns } from "@/components/charts/MonthlyColumns";
import { StatusBar } from "@/components/charts/StatusBar";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { StatCard } from "@/components/StatCard";
import { button } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { monthlyTotals, summarize } from "@/lib/stats";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const ICONS = {
  receivable: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M14.5 9.5c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.6 5 1.3 5 3.9 0 1.1-1.1 1.8-2.5 1.8-1.1 0-2-.4-2.5-1.2" />
    </>
  ),
  paid: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 9.5" />
    </>
  ),
  draft: (
    <>
      <path d="M5 3h9l5 5v13H5z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </>
  ),
  total: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
};

export default async function DashboardPage() {
  await connection();
  const now = new Date();
  const invoices = await prisma.invoice.findMany({ include: { items: true } });
  const { byStatus, overdue } = summarize(invoices, now);
  const months = monthlyTotals(invoices, now);

  return (
    <>
      <PageHeader title="Dashboard">
        <Link href="/invoices/new" className={button("primary")}>
          Nueva factura
        </Link>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Por cobrar"
          value={formatMoney(byStatus.SENT.totalCents)}
          badge={overdue.count > 0 ? plural(overdue.count, "vencida", "vencidas") : plural(byStatus.SENT.count, "enviada", "enviadas")}
          tone={overdue.count > 0 ? "bad" : "neutral"}
          icon={ICONS.receivable}
        />
        <StatCard
          label="Cobrado"
          value={formatMoney(byStatus.PAID.totalCents)}
          badge={plural(byStatus.PAID.count, "pagada", "pagadas")}
          tone="good"
          icon={ICONS.paid}
        />
        <StatCard
          label="Borradores"
          value={formatMoney(byStatus.DRAFT.totalCents)}
          badge={String(byStatus.DRAFT.count)}
          icon={ICONS.draft}
        />
        <StatCard label="Facturas" value={String(invoices.length)} icon={ICONS.total} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Importe por mes" subtitle="Últimos 6 meses, según fecha de emisión" className="lg:col-span-2">
          <MonthlyColumns months={months} />
        </Panel>
        <Panel title="Facturas por estado" subtitle="Reparto del total de facturas">
          <StatusBar summary={byStatus} />
        </Panel>
      </div>
    </>
  );
}

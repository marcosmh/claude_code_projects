import Link from "next/link";
import { connection } from "next/server";
import { MonthlyColumns } from "@/components/charts/MonthlyColumns";
import { StatusBar } from "@/components/charts/StatusBar";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { monthlyTotals, summarize } from "@/lib/stats";

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-zinc-500">{note}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-zinc-500">{subtitle}</p>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  await connection();
  const now = new Date();
  const invoices = await prisma.invoice.findMany({ include: { items: true } });
  const { byStatus, overdue } = summarize(invoices, now);
  const months = monthlyTotals(invoices, now);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/invoices/new" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-zinc-50 hover:bg-zinc-700">
          Nueva factura
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Facturas" value={String(invoices.length)} />
        <StatTile label="Cobrado" value={formatMoney(byStatus.PAID.totalCents)} note={`${byStatus.PAID.count} pagadas`} />
        <StatTile
          label="Por cobrar"
          value={formatMoney(byStatus.SENT.totalCents)}
          note={overdue.count > 0 ? `${overdue.count} vencidas · ${formatMoney(overdue.totalCents)}` : `${byStatus.SENT.count} enviadas`}
        />
        <StatTile label="Borradores" value={String(byStatus.DRAFT.count)} note={formatMoney(byStatus.DRAFT.totalCents)} />
      </div>

      <div className="space-y-6">
        <Card title="Facturas por estado" subtitle="Reparto del total de facturas">
          <StatusBar summary={byStatus} />
        </Card>
        <Card title="Importe por mes" subtitle="Últimos 6 meses, según fecha de emisión">
          <MonthlyColumns months={months} />
        </Card>
      </div>
    </>
  );
}

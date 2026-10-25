import type { ReactNode } from "react";
import { Link } from "react-router";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { PageSkeleton, Skeleton } from "@/components/common/Skeleton";
import { StatCard } from "@/components/common/StatCard";
import { button } from "@/components/common/ui";
import { MonthlyColumns } from "@/components/features/dashboard/MonthlyColumns";
import { StatusBar } from "@/components/features/dashboard/StatusBar";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMonthlyStats, useStatsSummary } from "@/hooks/useStats";
import { formatMoney, plural } from "@/utils/format";

const ICONS: Record<"receivable" | "paid" | "draft" | "total", ReactNode> = {
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

export function DashboardPage() {
  useDocumentTitle("Dashboard");
  const summary = useStatsSummary();
  const monthly = useMonthlyStats(6);

  const header = (
    <PageHeader title="Dashboard">
      <Link to="/invoices/new" className={button("primary")}>
        Nueva factura
      </Link>
    </PageHeader>
  );

  if (summary.isPending) return <PageSkeleton rows={4} />;
  if (summary.isError) return <ErrorState message="No pudimos leer las estadísticas." onRetry={() => void summary.refetch()} />;

  const { byStatus, overdue, totalCount } = summary.data;

  return (
    <>
      {header}

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
        <StatCard label="Borradores" value={formatMoney(byStatus.DRAFT.totalCents)} badge={String(byStatus.DRAFT.count)} icon={ICONS.draft} />
        <StatCard label="Facturas" value={String(totalCount)} icon={ICONS.total} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Importe por mes" subtitle="Últimos 6 meses, según fecha de emisión" className="lg:col-span-2">
          {monthly.isPending && <Skeleton className="h-64 w-full" />}
          {monthly.isError && (
            <p role="alert" className="text-sm text-red-700">
              No pudimos cargar el gráfico mensual.{" "}
              <button type="button" className="underline" onClick={() => void monthly.refetch()}>
                Reintentar
              </button>
            </p>
          )}
          {monthly.data && <MonthlyColumns months={monthly.data} />}
        </Panel>
        <Panel title="Facturas por estado" subtitle="Reparto del total de facturas">
          <StatusBar summary={byStatus} />
        </Panel>
      </div>
    </>
  );
}

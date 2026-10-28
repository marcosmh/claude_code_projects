import { Link } from "react-router";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeleton";
import { button } from "@/components/common/ui";
import { InvoiceFilters } from "@/components/features/invoices/InvoiceFilters";
import { InvoiceTable } from "@/components/features/invoices/InvoiceTable";
import { Pagination } from "@/components/features/invoices/Pagination";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useInvoiceFilters } from "@/hooks/useInvoiceFilters";
import { useInvoices } from "@/hooks/useInvoices";
import { useStatsSummary } from "@/hooks/useStats";

export function InvoicesPage() {
  useDocumentTitle("Facturas");
  const { q, status, statuses, sidebarActive, hasFilters, apiParams, update } = useInvoiceFilters();
  const list = useInvoices(apiParams);
  const summary = useStatsSummary();

  // Los contadores son totales globales: con búsqueda o con filtros de fecha, importe o varios estados no coincidirían con la tabla, así que se ocultan.
  const countsMatchTable = !q && (statuses.length <= 1 ? sidebarActive === (statuses.length === 1 ? 1 : 0) : false);
  const counts = summary.data && countsMatchTable
    ? {
        "": summary.data.totalCount,
        DRAFT: summary.data.byStatus.DRAFT.count,
        SENT: summary.data.byStatus.SENT.count,
        PAID: summary.data.byStatus.PAID.count,
      }
    : {};
  const filtering = hasFilters;

  return (
    <>
      <PageHeader title="Facturas">
        <Link to="/invoices/new" className={button("primary")}>
          Nueva factura
        </Link>
      </PageHeader>

      {list.isPending && <PageSkeleton />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => void list.refetch()} />}

      {list.data && list.data.meta.total === 0 && !filtering && (
        <EmptyState title="Aún no hay facturas" description="Crea la primera para ver aquí su estado y su total.">
          <Link to="/invoices/new" className={`${button("primary")} mt-4`}>
            Crear factura
          </Link>
        </EmptyState>
      )}

      {list.data && (list.data.meta.total > 0 || filtering) && (
        <>
          <InvoiceFilters q={q} status={status} multiple={statuses.length > 1} counts={counts} onChange={update} />
          {list.data.items.length === 0 ? (
            <EmptyState title="Ninguna factura coincide" description="Prueba con otro texto o quita algún filtro.">
              <Link to="/invoices" className="mt-4 inline-block text-sm text-brand hover:underline">
                Quitar filtros
              </Link>
            </EmptyState>
          ) : (
            <div aria-busy={list.isPlaceholderData} className={list.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
              <InvoiceTable invoices={list.data.items} />
              <Pagination meta={list.data.meta} onPageChange={(page) => update({ page })} />
            </div>
          )}
        </>
      )}
    </>
  );
}

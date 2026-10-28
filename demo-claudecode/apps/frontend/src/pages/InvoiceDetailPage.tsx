import { Link, useNavigate, useParams } from "react-router";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/Skeleton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { button, money, sheet } from "@/components/common/ui";
import { DeleteInvoiceDialog } from "@/components/features/invoices/DeleteInvoiceDialog";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useInvoice } from "@/hooks/useInvoice";
import { useInvoiceMutations } from "@/hooks/useInvoiceMutations";
import { useInvoicePdf } from "@/hooks/useInvoicePdf";
import { ApiError } from "@/services/apiClient";
import { formatDate, formatMoney } from "@/utils/format";
import { NotFoundPage } from "./NotFoundPage";
import { parseId } from "./parseId";

export function InvoiceDetailPage() {
  const id = parseId(useParams().id);
  const navigate = useNavigate();
  const { data: invoice, error, isPending, refetch } = useInvoice(id);
  const { changeStatus, remove } = useInvoiceMutations();
  const pdf = useInvoicePdf();
  useDocumentTitle(invoice?.number ?? "Factura");

  if (id === null || (error instanceof ApiError && error.status === 404)) return <NotFoundPage />;
  if (isPending) return <PageSkeleton rows={5} />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  const nextStatus = invoice.status === "DRAFT" ? "SENT" : invoice.status === "SENT" ? "PAID" : null;

  return (
    <>
      <Link to="/invoices" className="mb-3 inline-block text-sm text-brand hover:underline">
        ← Facturas
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{invoice.number}</h1>
          <StatusBadge status={invoice.status} overdue={invoice.isOverdue} />
        </div>
        <div className="flex flex-wrap gap-2">
          {nextStatus && (
            <button
              type="button"
              disabled={changeStatus.isPending}
              onClick={() => changeStatus.mutate({ id: invoice.id, status: nextStatus })}
              className={button("secondary", "sm")}
            >
              {changeStatus.isPending ? "Marcando…" : nextStatus === "SENT" ? "Marcar como enviada" : "Marcar como pagada"}
            </button>
          )}
          <button type="button" disabled={pdf.isPending} onClick={() => void pdf.open(invoice.id)} className={button("primary", "sm")}>
            {pdf.isPending ? "Abriendo PDF…" : "Ver PDF"}
          </button>
          <Link to={`/invoices/${invoice.id}/edit`} className={button("secondary", "sm")}>
            Editar
          </Link>
          <DeleteInvoiceDialog
            number={invoice.number}
            pending={remove.isPending}
            onConfirm={() =>
              remove.mutate(
                { id: invoice.id, number: invoice.number },
                { onSuccess: () => void navigate("/invoices") },
              )
            }
          />
        </div>
      </div>

      <article className={sheet}>
        <div className="grid gap-6 border-b border-zinc-200 p-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-zinc-500">Facturar a</p>
            <p className="text-lg font-bold">{invoice.clientName}</p>
            {invoice.clientEmail && <p className="text-zinc-600">{invoice.clientEmail}</p>}
            {invoice.clientAddress && <p className="text-zinc-600">{invoice.clientAddress}</p>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] content-start gap-x-6 gap-y-1 sm:justify-self-end">
            <dt className="text-zinc-500">Emisión</dt>
            <dd className="sm:text-right">{formatDate(invoice.issueDate)}</dd>
            <dt className="text-zinc-500">Vencimiento</dt>
            <dd className="sm:text-right">{formatDate(invoice.dueDate)}</dd>
          </dl>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm tabular-nums">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th scope="col" className="px-6 py-2.5 font-medium">Descripción</th>
                <th scope="col" className="px-3 text-right font-medium">Cant.</th>
                <th scope="col" className="px-3 text-right font-medium">Precio</th>
                <th scope="col" className="px-6 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((i) => (
                <tr key={i.id} className="border-b border-zinc-100">
                  <td className="px-6 py-3">{i.description}</td>
                  <td className="px-3 text-right">{i.quantity}</td>
                  <td className="px-3 text-right">{formatMoney(i.unitPriceCents, invoice.currency)}</td>
                  <td className="px-6 text-right">{formatMoney(i.amountCents, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-6 border-t border-zinc-200 p-6 sm:flex-row sm:justify-between">
          <p className="max-w-prose whitespace-pre-line text-sm text-zinc-600">{invoice.notes}</p>
          <dl className="w-full space-y-1.5 text-sm tabular-nums sm:w-64 sm:shrink-0">
            <div className="flex justify-between">
              <dt className="text-zinc-600">Subtotal</dt>
              <dd>{formatMoney(invoice.subtotalCents, invoice.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600">Impuesto ({invoice.taxRate}%)</dt>
              <dd>{formatMoney(invoice.taxCents, invoice.currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-zinc-200 pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className={`${money} text-3xl font-semibold text-brand`}>{formatMoney(invoice.totalCents, invoice.currency)}</dd>
            </div>
          </dl>
        </div>
      </article>
    </>
  );
}

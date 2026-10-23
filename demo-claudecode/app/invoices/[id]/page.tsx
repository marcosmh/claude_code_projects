import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { DeleteButton } from "@/components/DeleteButton";
import { StatusBadge } from "@/components/StatusBadge";
import { button, money, sheet } from "@/components/ui";
import { setInvoiceStatus } from "@/lib/actions/invoices";
import { formatDate, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isOverdue } from "@/lib/stats";
import { calcTotals } from "@/lib/totals";

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  await connection();
  const { id } = await params;
  const invoice = Number.isInteger(Number(id))
    ? await prisma.invoice.findUnique({ where: { id: Number(id) }, include: { items: true } })
    : null;
  if (!invoice) notFound();

  const totals = calcTotals(invoice.items, invoice.taxRate);

  return (
    <>
      <Flash />
      <Link href="/invoices" className="mb-3 inline-block text-sm text-brand hover:underline">← Facturas</Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{invoice.number}</h1>
          <StatusBadge status={invoice.status} overdue={isOverdue(invoice, new Date())} />
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "DRAFT" && (
            <form action={setInvoiceStatus.bind(null, invoice.id, "SENT")}>
              <SubmitButton pendingText="Marcando…">Marcar como enviada</SubmitButton>
            </form>
          )}
          {invoice.status === "SENT" && (
            <form action={setInvoiceStatus.bind(null, invoice.id, "PAID")}>
              <SubmitButton pendingText="Marcando…">Marcar como pagada</SubmitButton>
            </form>
          )}
          <a href={`/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener" className={button("primary", "sm")}>
            Ver PDF
          </a>
          <Link href={`/invoices/${invoice.id}/edit`} className={button("secondary", "sm")}>
            Editar
          </Link>
          <DeleteButton id={invoice.id} number={invoice.number} />
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
                  <td className="px-3 text-right">{formatMoney(i.unitPriceCents)}</td>
                  <td className="px-6 text-right">{formatMoney(Math.round(i.quantity * i.unitPriceCents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-6 border-t border-zinc-200 p-6 sm:flex-row sm:justify-between">
          <p className="max-w-prose whitespace-pre-line text-sm text-zinc-600">{invoice.notes}</p>
          <dl className="w-full space-y-1.5 text-sm tabular-nums sm:w-64 sm:shrink-0">
            <div className="flex justify-between"><dt className="text-zinc-600">Subtotal</dt><dd>{formatMoney(totals.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-600">Impuesto ({invoice.taxRate}%)</dt><dd>{formatMoney(totals.taxCents)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-zinc-200 pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className={`${money} text-3xl font-semibold text-brand`}>{formatMoney(totals.totalCents)}</dd>
            </div>
          </dl>
        </div>
      </article>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { calcTotals } from "@/lib/totals";

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const invoice = Number.isInteger(Number(id))
    ? await prisma.invoice.findUnique({ where: { id: Number(id) }, include: { items: true } })
    : null;
  if (!invoice) notFound();

  const totals = calcTotals(invoice.items, invoice.taxRate);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{invoice.number}</h1>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex gap-2">
          <a
            href={`/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-zinc-50 hover:bg-zinc-700"
          >
            Ver PDF
          </a>
          <Link href={`/invoices/${invoice.id}/edit`} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
            Editar
          </Link>
          <DeleteButton id={invoice.id} number={invoice.number} />
        </div>
      </div>

      <div className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium">{invoice.clientName}</p>
          {invoice.clientEmail && <p className="text-zinc-600">{invoice.clientEmail}</p>}
          {invoice.clientAddress && <p className="text-zinc-600">{invoice.clientAddress}</p>}
        </div>
        <div className="sm:text-right">
          <p>Emisión: {formatDate(invoice.issueDate)}</p>
          <p>Vencimiento: {formatDate(invoice.dueDate)}</p>
        </div>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-zinc-500">
          <tr>
            <th className="py-2">Descripción</th>
            <th className="text-right">Cant.</th>
            <th className="text-right">Precio</th>
            <th className="text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((i) => (
            <tr key={i.id} className="border-b border-zinc-100">
              <td className="py-2">{i.description}</td>
              <td className="text-right">{i.quantity}</td>
              <td className="text-right">{formatMoney(i.unitPriceCents)}</td>
              <td className="text-right">{formatMoney(Math.round(i.quantity * i.unitPriceCents))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto mt-4 w-64 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(totals.subtotalCents)}</dd></div>
        <div className="flex justify-between"><dt>Impuesto ({invoice.taxRate}%)</dt><dd>{formatMoney(totals.taxCents)}</dd></div>
        <div className="flex justify-between border-t pt-1 font-semibold"><dt>Total</dt><dd>{formatMoney(totals.totalCents)}</dd></div>
      </dl>

      {invoice.notes && <p className="mt-6 whitespace-pre-line text-sm text-zinc-600">{invoice.notes}</p>}

      <Link href="/invoices" className="mt-8 inline-block text-sm text-blue-700 hover:underline">← Volver al listado</Link>
    </>
  );
}

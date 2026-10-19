import Link from "next/link";
import { connection } from "next/server";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { calcTotals } from "@/lib/totals";

export default async function InvoicesPage() {
  await connection();
  const invoices = await prisma.invoice.findMany({
    orderBy: { id: "desc" },
    include: { items: true },
  });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Facturas</h1>
        <Link href="/invoices/new" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-zinc-50 hover:bg-zinc-700">
          Nueva factura
        </Link>
      </div>

      {invoices.length === 0 ? (
        <p className="text-zinc-500">Aún no hay facturas. Crea la primera.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="py-2">Número</th>
              <th>Cliente</th>
              <th>Emisión</th>
              <th>Estado</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="py-2">
                  <Link href={`/invoices/${inv.id}`} className="font-medium text-blue-700 hover:underline">
                    {inv.number}
                  </Link>
                </td>
                <td>{inv.clientName}</td>
                <td>{formatDate(inv.issueDate)}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td className="text-right">{formatMoney(calcTotals(inv.items, inv.taxRate).totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

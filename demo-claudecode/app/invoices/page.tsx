import Link from "next/link";
import { connection } from "next/server";
import { Flash } from "@/components/Flash";
import { InvoiceFilters } from "@/components/InvoiceFilters";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { button, money, sheet } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isOverdue } from "@/lib/stats";
import { calcTotals } from "@/lib/totals";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  await connection();
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const status = first(sp.status);

  const all = await prisma.invoice.findMany({
    orderBy: { id: "desc" },
    include: { items: true },
  });

  const counts: Record<string, number> = { "": all.length };
  for (const inv of all) counts[inv.status] = (counts[inv.status] ?? 0) + 1;

  const needle = q.toLowerCase();
  const invoices = all.filter(
    (inv) =>
      (!status || inv.status === status) &&
      (!needle || inv.number.toLowerCase().includes(needle) || inv.clientName.toLowerCase().includes(needle)),
  );
  const now = new Date();

  return (
    <>
      <Flash />
      <PageHeader title="Facturas">
        <Link href="/invoices/new" className={button("primary")}>
          Nueva factura
        </Link>
      </PageHeader>

      {all.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center">
          <p className="font-medium">Aún no hay facturas</p>
          <p className="mt-1 text-sm text-zinc-500">Crea la primera para ver aquí su estado y su total.</p>
          <Link href="/invoices/new" className={`${button("primary")} mt-4`}>
            Crear factura
          </Link>
        </div>
      ) : (
        <>
          <InvoiceFilters q={q} status={status} counts={counts} />
          {invoices.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center">
              <p className="font-medium">Ninguna factura coincide</p>
              <p className="mt-1 text-sm text-zinc-500">Prueba con otro texto o quita el filtro de estado.</p>
              <Link href="/invoices" className="mt-4 inline-block text-sm text-brand hover:underline">
                Quitar filtros
              </Link>
            </div>
          ) : (
            <div className={`${sheet} overflow-x-auto`}>
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Número</th>
                    <th scope="col" className="px-3 font-medium">Cliente</th>
                    <th scope="col" className="px-3 font-medium">Emisión</th>
                    <th scope="col" className="px-3 font-medium">Vence</th>
                    <th scope="col" className="px-3 font-medium">Estado</th>
                    <th scope="col" className="px-4 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="font-medium text-brand hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-3">{inv.clientName}</td>
                      <td className="px-3 text-zinc-600">{formatDate(inv.issueDate)}</td>
                      <td className="px-3 text-zinc-600">{formatDate(inv.dueDate)}</td>
                      <td className="px-3"><StatusBadge status={inv.status} overdue={isOverdue(inv, now)} /></td>
                      <td className={`px-4 text-right font-semibold ${money}`}>{formatMoney(calcTotals(inv.items, inv.taxRate).totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

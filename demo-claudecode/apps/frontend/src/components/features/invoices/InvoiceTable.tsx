import { Link } from "react-router";
import { StatusBadge } from "@/components/common/StatusBadge";
import { money, sheet } from "@/components/common/ui";
import type { Invoice } from "@/types/invoice";
import { formatDate, formatMoney } from "@/utils/format";

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
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
                <Link to={`/invoices/${inv.id}`} className="font-medium text-brand hover:underline">
                  {inv.number}
                </Link>
              </td>
              <td className="px-3">{inv.clientName}</td>
              <td className="px-3 text-zinc-600">{formatDate(inv.issueDate)}</td>
              <td className="px-3 text-zinc-600">{formatDate(inv.dueDate)}</td>
              <td className="px-3">
                <StatusBadge status={inv.status} overdue={inv.isOverdue} />
              </td>
              <td className={`px-4 text-right font-semibold ${money}`}>{formatMoney(inv.totalCents, inv.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

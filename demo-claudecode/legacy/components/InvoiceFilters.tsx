import Link from "next/link";
import { button } from "@/components/ui";
import { STATUS_LABELS, STATUSES } from "@/lib/validators";

type Props = {
  q: string;
  status: string;
  counts: Record<string, number>;
};

function href(q: string, status: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const qs = params.toString();
  return qs ? `/invoices?${qs}` : "/invoices";
}

/** Búsqueda y filtro por estado; todo vive en la URL, así se puede compartir y no necesita JS. */
export function InvoiceFilters({ q, status, counts }: Props) {
  const tabs = [{ value: "", label: "Todas" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))];
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-zinc-200 sm:flex-row sm:items-end sm:justify-between">
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-x-5">
        {tabs.map((t) => {
          const current = status === t.value;
          return (
            <Link
              key={t.value || "all"}
              href={href(q, t.value)}
              aria-current={current ? "true" : undefined}
              className={`-mb-px border-b-2 py-2 text-sm ${
                current
                  ? "border-zinc-900 font-medium text-zinc-900"
                  : "border-transparent text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t.label} <span className="tabular-nums opacity-70">{counts[t.value] ?? 0}</span>
            </Link>
          );
        })}
      </nav>
      <form action="/invoices" role="search" className="flex gap-2 pb-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          aria-label="Buscar por número o cliente"
          placeholder="Buscar número o cliente"
          className="w-full min-w-0 rounded-md border border-zinc-300 bg-surface px-3 py-1.5 text-sm hover:border-zinc-500 sm:w-64"
        />
        <button className={button("secondary", "sm")}>Buscar</button>
      </form>
    </div>
  );
}

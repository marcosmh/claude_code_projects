import { useState } from "react";
import { button } from "@/components/common/ui";
import type { Status } from "@/types/invoice";
import { STATUS_LABELS, STATUSES } from "@/utils/status";

interface InvoiceFiltersProps {
  q: string;
  status: Status | undefined;
  counts: Partial<Record<Status | "", number>>;
  onChange: (next: { q?: string; status?: Status | "" }) => void;
}

/** Búsqueda y filtro por estado; el padre los refleja en la URL. */
export function InvoiceFilters({ q, status, counts, onChange }: InvoiceFiltersProps) {
  const [draft, setDraft] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  // Si la URL cambia desde fuera (p. ej. "Quitar filtros"), el borrador se alinea durante el render.
  if (q !== syncedQ) {
    setSyncedQ(q);
    setDraft(q);
  }

  const tabs: { value: Status | ""; label: string }[] = [
    { value: "", label: "Todas" },
    ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
  ];

  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-zinc-200 sm:flex-row sm:items-end sm:justify-between">
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-x-5">
        {tabs.map((t) => {
          const current = (status ?? "") === t.value;
          return (
            <button
              key={t.value || "all"}
              type="button"
              onClick={() => onChange({ status: t.value })}
              aria-current={current ? "true" : undefined}
              className={`-mb-px border-b-2 py-2 text-sm ${
                current
                  ? "border-zinc-900 font-medium text-zinc-900"
                  : "border-transparent text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t.label} <span className="tabular-nums opacity-70">{counts[t.value] ?? 0}</span>
            </button>
          );
        })}
      </nav>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onChange({ q: draft });
        }}
        className="flex gap-2 pb-2"
      >
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Buscar por número o cliente"
          placeholder="Buscar número o cliente"
          className="w-full min-w-0 rounded-md border border-zinc-300 bg-surface px-3 py-1.5 text-sm hover:border-zinc-500 sm:w-64"
        />
        <button type="submit" className={button("secondary", "sm")}>
          Buscar
        </button>
      </form>
    </div>
  );
}

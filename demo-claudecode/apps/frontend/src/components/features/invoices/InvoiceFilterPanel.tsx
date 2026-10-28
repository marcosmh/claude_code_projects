import { useId, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { button } from "@/components/common/ui";
import { useInvoiceFilters } from "@/hooks/useInvoiceFilters";
import { useUiStore } from "@/store/uiStore";
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/types/invoice";
import { STATUS_LABELS, STATUSES } from "@/utils/status";

const control =
  "w-full rounded-md border border-zinc-300 bg-surface px-2.5 py-1.5 text-sm hover:border-zinc-500 focus-visible:border-brand aria-invalid:border-red-500 disabled:opacity-50 disabled:hover:border-zinc-300";

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-1 text-sm font-medium text-zinc-900">{legend}</legend>
      {children}
    </fieldset>
  );
}

function LabeledInput({ label, error, ...props }: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-0.5 block text-xs text-zinc-600">
        {label}
      </label>
      <input id={id} className={control} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Filtros de la lista de facturas en la barra lateral, plegables: estados, rango de fecha de emisión
 * y rango de importe (el importe se compara dentro de una moneda). Todo vive en la URL.
 */
export function InvoiceFilterPanel() {
  const filters = useInvoiceFilters();
  const { statuses, from, to, currency, min, max, sidebarActive, update, clearSidebar } = filters;
  const collapsed = useUiStore((s) => s.filtersCollapsed);
  const toggle = useUiStore((s) => s.toggleFilters);
  const panelId = useId();

  // Borradores: un valor a medias o inválido no toca la URL; si la URL cambia desde fuera, se alinean durante el render.
  const urlKey = [from, to, min, max].join("|");
  const [syncedKey, setSyncedKey] = useState(urlKey);
  const [draft, setDraft] = useState({ from, to, min, max });
  const [errors, setErrors] = useState<{ to?: string; max?: string }>({});
  if (urlKey !== syncedKey) {
    setSyncedKey(urlKey);
    setDraft({ from, to, min, max });
    setErrors({});
  }

  const commitDate = (next: { from: string; to: string }) => {
    setDraft((d) => ({ ...d, ...next }));
    if (next.from && next.to && next.from > next.to) {
      setErrors((e) => ({ ...e, to: "La fecha final no puede ser anterior a la inicial" }));
      return;
    }
    setErrors((e) => ({ ...e, to: undefined }));
    update(next);
  };

  const commitAmounts = () => {
    const lo = draft.min.trim();
    const hi = draft.max.trim();
    const bad = (v: string) => v !== "" && !(Number.isFinite(Number(v)) && Number(v) >= 0);
    if (bad(lo) || bad(hi)) {
      setErrors((e) => ({ ...e, max: "Escribe importes de 0 en adelante" }));
      return;
    }
    if (lo && hi && Number(lo) > Number(hi)) {
      setErrors((e) => ({ ...e, max: "El máximo no puede ser menor que el mínimo" }));
      return;
    }
    setErrors((e) => ({ ...e, max: undefined }));
    if (lo !== min || hi !== max) update({ min: lo, max: hi });
  };

  // Sin botón de envío, Enter no dispara el submit del formulario (hay varios campos): se atiende aquí.
  const commitOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    commitAmounts();
  };

  const toggleStatus = (s: (typeof STATUSES)[number]) =>
    update({ statuses: statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s] });

  const changeCurrency = (next: Currency | "") => {
    // Sin moneda un importe no significa nada: se quita junto con ella.
    if (next === "") update({ currency: "", min: "", max: "" });
    else update({ currency: next });
  };

  return (
    <section aria-label="Filtros de facturas" className="w-full border-zinc-200 md:mt-2 md:border-t md:pt-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        <span className="flex items-center gap-2.5">
          <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
            <path d="M3 4.5h14l-5.2 6.2v4.6l-3.6 1.7v-6.3z" />
          </svg>
          Filtros
          {sidebarActive > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs font-semibold tabular-nums text-on-primary" aria-label={`${sidebarActive} activos`}>
              {sidebarActive}
            </span>
          )}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`size-4 shrink-0 transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      <form
        id={panelId}
        hidden={collapsed}
        noValidate
        onSubmit={(e) => e.preventDefault()}
        className="space-y-5 px-3 pb-2 pt-3"
      >
        <Group legend="Estado">
          {STATUSES.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={statuses.includes(s)} onChange={() => toggleStatus(s)} className="size-4 accent-[var(--color-primary-dark)]" />
              {STATUS_LABELS[s]}
            </label>
          ))}
        </Group>

        <Group legend="Fecha de emisión">
          <LabeledInput label="Desde" type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => commitDate({ from: e.target.value, to: draft.to })} />
          <LabeledInput label="Hasta" type="date" value={draft.to} min={draft.from || undefined} error={errors.to} onChange={(e) => commitDate({ from: draft.from, to: e.target.value })} />
        </Group>

        <Group legend="Importe">
          <div>
            <label htmlFor={`${panelId}-currency`} className="mb-0.5 block text-xs text-zinc-600">
              Moneda
            </label>
            <select id={`${panelId}-currency`} className={control} value={currency} onChange={(e) => changeCurrency(e.target.value as Currency | "")}>
              <option value="">Todas</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <LabeledInput
            label="Mínimo (con impuestos)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            disabled={!currency}
            value={draft.min}
            onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
            onBlur={commitAmounts}
            onKeyDown={commitOnEnter}
          />
          <LabeledInput
            label="Máximo (con impuestos)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            disabled={!currency}
            value={draft.max}
            error={errors.max}
            onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
            onBlur={commitAmounts}
            onKeyDown={commitOnEnter}
          />
          {!currency && <p className="text-xs text-zinc-600">Elige una moneda para filtrar por importe.</p>}
        </Group>

        <button type="button" className={`${button("secondary", "sm")} w-full`} onClick={clearSidebar} disabled={sidebarActive === 0}>
          Quitar filtros
        </button>
      </form>
    </section>
  );
}

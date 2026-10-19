"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/actions/invoices";
import { formatMoney } from "@/lib/format";
import { calcTotals } from "@/lib/totals";
import { STATUS_LABELS, STATUSES } from "@/lib/validators";

type Line = { description: string; quantity: string; price: string };

export type InvoiceFormValues = {
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  status: string;
  taxRate: string;
  notes: string;
  items: Line[];
};

const input = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm";
const label = "mb-1 block text-sm font-medium text-zinc-700";

export function InvoiceForm({
  initial,
  action,
  cancelHref,
}: {
  initial: InvoiceFormValues;
  action: (input: unknown) => Promise<ActionState>;
  cancelHref: string;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const set = (k: keyof InvoiceFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));
  const setLine = (i: number, k: keyof Line, value: string) =>
    setV((p) => ({ ...p, items: p.items.map((l, j) => (j === i ? { ...l, [k]: value } : l)) }));

  const payload = {
    ...v,
    taxRate: Number(v.taxRate || 0),
    items: v.items.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPriceCents: Math.round(Number(l.price || 0) * 100),
    })),
  };
  const totals = calcTotals(
    payload.items.map((i) => ({ quantity: i.quantity || 0, unitPriceCents: i.unitPriceCents })),
    payload.taxRate,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await action(payload);
      if (result?.errors) setErrors(result.errors);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {errors.length > 0 && (
        <ul className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Cliente *</label>
          <input className={input} value={v.clientName} onChange={set("clientName")} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input className={input} type="email" value={v.clientEmail} onChange={set("clientEmail")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Dirección</label>
          <input className={input} value={v.clientAddress} onChange={set("clientAddress")} />
        </div>
        <div>
          <label className={label}>Fecha de emisión</label>
          <input className={input} type="date" value={v.issueDate} onChange={set("issueDate")} />
        </div>
        <div>
          <label className={label}>Vencimiento</label>
          <input className={input} type="date" value={v.dueDate} onChange={set("dueDate")} />
        </div>
        <div>
          <label className={label}>Estado</label>
          <select className={input} value={v.status} onChange={set("status")}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Impuesto (%)</label>
          <input className={input} type="number" min="0" max="100" step="0.01" value={v.taxRate} onChange={set("taxRate")} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Líneas</h2>
        <div className="space-y-2">
          {v.items.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_7rem_auto] items-center gap-2">
              <input className={input} placeholder="Descripción" value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} />
              <input className={input} type="number" min="0" step="any" placeholder="Cant." value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} />
              <input className={input} type="number" min="0" step="0.01" placeholder="Precio" value={l.price} onChange={(e) => setLine(i, "price", e.target.value)} />
              <button
                type="button"
                aria-label="Quitar línea"
                disabled={v.items.length === 1}
                onClick={() => setV((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }))}
                className="px-2 text-zinc-500 hover:text-red-600 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setV((p) => ({ ...p, items: [...p.items, { description: "", quantity: "1", price: "" }] }))}
          className="mt-2 text-sm text-blue-700 hover:underline"
        >
          + Agregar línea
        </button>
      </section>

      <div>
        <label className={label}>Notas</label>
        <textarea className={input} rows={3} value={v.notes} onChange={set("notes")} />
      </div>

      <dl className="ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(totals.subtotalCents)}</dd></div>
        <div className="flex justify-between"><dt>Impuesto</dt><dd>{formatMoney(totals.taxCents)}</dd></div>
        <div className="flex justify-between border-t pt-1 font-semibold"><dt>Total</dt><dd>{formatMoney(totals.totalCents)}</dd></div>
      </dl>

      <div className="flex gap-3">
        <button disabled={pending} className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-zinc-50 hover:bg-zinc-700 disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <Link href={cancelHref} className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

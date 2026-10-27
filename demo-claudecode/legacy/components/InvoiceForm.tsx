"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionState } from "@/lib/actions/invoices";
import { calcTotals } from "@/lib/totals";
import {
  invoiceFormSchema,
  STATUS_LABELS,
  STATUSES,
  type InvoiceFormValues,
  type InvoiceInput,
} from "@/lib/validators";
import { button, sheet } from "@/components/ui";
import { Field, inputClass } from "./invoice-form/Field";
import { LineItemsEditor } from "./invoice-form/LineItemsEditor";
import { TotalsSummary } from "./invoice-form/TotalsSummary";

export type { InvoiceFormValues };

export function InvoiceForm({
  initial,
  action,
  cancelHref,
}: {
  initial: InvoiceFormValues;
  action: (input: unknown) => Promise<ActionState>;
  cancelHref: string;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceFormValues, unknown, InvoiceInput>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: initial,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const items = useWatch({ control, name: "items" });
  const taxRate = useWatch({ control, name: "taxRate" });
  const totals = useMemo(
    () =>
      calcTotals(
        items.map((l) => ({
          quantity: Number(l.quantity) || 0,
          unitPriceCents: Math.round(Number(l.price || 0) * 100),
        })),
        Number(taxRate || 0),
      ),
    [items, taxRate],
  );

  const submit = handleSubmit((data) => {
    setServerErrors([]);
    start(async () => {
      const result = await action(data);
      if (result?.errors) setServerErrors(result.errors);
    });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {serverErrors.length > 0 && (
        <ul role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {serverErrors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <div className={`${sheet} divide-y divide-zinc-200`}>
      <section className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Cliente *" error={errors.clientName?.message}>
          {(a) => <input {...a} className={inputClass} {...register("clientName")} />}
        </Field>
        <Field label="Email" error={errors.clientEmail?.message}>
          {(a) => <input {...a} className={inputClass} type="email" {...register("clientEmail")} />}
        </Field>
        <Field label="Dirección" className="sm:col-span-2" error={errors.clientAddress?.message}>
          {(a) => <input {...a} className={inputClass} {...register("clientAddress")} />}
        </Field>
        <Field label="Fecha de emisión" error={errors.issueDate?.message}>
          {(a) => <input {...a} className={inputClass} type="date" {...register("issueDate")} />}
        </Field>
        <Field label="Vencimiento" error={errors.dueDate?.message}>
          {(a) => <input {...a} className={inputClass} type="date" {...register("dueDate")} />}
        </Field>
        <Field label="Estado" error={errors.status?.message}>
          {(a) => (
            <select {...a} className={inputClass} {...register("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Impuesto (%)" error={errors.taxRate?.message}>
          {(a) => <input {...a} className={inputClass} type="number" min="0" max="100" step="0.01" {...register("taxRate")} />}
        </Field>
      </section>

      <LineItemsEditor
        fields={fields}
        register={register}
        errors={errors.items}
        onRemove={remove}
        onAdd={() => append({ description: "", quantity: "1", price: "" })}
      />

      <div className="p-6">
        <Field label="Notas" error={errors.notes?.message}>
          {(a) => <textarea {...a} className={inputClass} rows={3} {...register("notes")} />}
        </Field>
      </div>

      <div className="p-6">
        <TotalsSummary totals={totals} />
      </div>
      </div>

      <div className="flex gap-3">
        <button disabled={pending} className={button("primary")}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <Link href={cancelHref} className={button("secondary")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

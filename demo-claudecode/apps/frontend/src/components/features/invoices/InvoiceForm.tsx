import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { button, sheet } from "@/components/common/ui";
import { ApiError } from "@/services/apiClient";
import type { InvoiceRequest } from "@/types/invoice";
import { invoiceFormSchema, mapServerErrors, type InvoiceFormValues } from "@/utils/invoiceForm";
import { STATUS_LABELS, STATUSES } from "@/utils/status";
import { previewTotals } from "@/utils/totalsPreview";
import { Field, inputClass } from "./form/Field";
import { LineItemsEditor } from "./form/LineItemsEditor";
import { TotalsSummary } from "./form/TotalsSummary";

interface InvoiceFormProps {
  initial: InvoiceFormValues;
  /** Debe lanzar `ApiError` si el servidor rechaza los datos; sus errores se muestran en el formulario. */
  onSubmit: (input: InvoiceRequest) => Promise<unknown>;
  cancelTo: string;
}

export function InvoiceForm({ initial, onSubmit, cancelTo }: InvoiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues, unknown, InvoiceRequest>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: initial,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  const items = useWatch({ control, name: "items" });
  const taxRate = useWatch({ control, name: "taxRate" });
  const totals = useMemo(
    () =>
      previewTotals(
        items.map((l) => ({ quantity: Number(l.quantity) || 0, unitPriceCents: Math.round(Number(l.price || 0) * 100) })),
        Number(taxRate || 0),
      ),
    [items, taxRate],
  );

  const submit = handleSubmit(async (data) => {
    setGeneralErrors([]);
    try {
      await onSubmit(data);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setGeneralErrors(["Ocurrió un error inesperado. Inténtalo de nuevo."]);
        return;
      }
      const mapped = mapServerErrors(error.details, error.message);
      for (const f of mapped.fields) setError(f.name as FieldPath<InvoiceFormValues>, { type: "server", message: f.message });
      setGeneralErrors(mapped.general);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {generalErrors.length > 0 && (
        <ul role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {generalErrors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <div className={`${sheet} divide-y divide-zinc-200`}>
        <section className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Cliente *" required error={errors.clientName?.message}>
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
        <button type="submit" disabled={isSubmitting} className={button("primary")}>
          {isSubmitting ? "Guardando…" : "Guardar"}
        </button>
        <Link to={cancelTo} className={button("secondary")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

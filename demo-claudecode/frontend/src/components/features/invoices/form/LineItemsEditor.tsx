import type { FieldArrayWithId, FieldErrors, UseFormRegister } from "react-hook-form";
import type { InvoiceFormValues } from "@/utils/invoiceForm";
import { inputClass } from "./Field";

type LineError = Partial<Record<"description" | "quantity" | "price", { message?: string }>>;

export function LineItemsEditor({
  fields,
  register,
  errors,
  onRemove,
  onAdd,
}: {
  fields: FieldArrayWithId<InvoiceFormValues, "items">[];
  register: UseFormRegister<InvoiceFormValues>;
  errors: FieldErrors<InvoiceFormValues>["items"];
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  return (
    <section className="p-6">
      <h2 className="mb-3 text-base">Líneas</h2>
      <div className="space-y-2">
        {fields.map((f, i) => {
          const e = (errors?.[i] ?? {}) as LineError;
          const messages = [e.description, e.quantity, e.price].map((x) => x?.message).filter(Boolean);
          return (
            <div key={f.id}>
              <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
                <input
                  className={`${inputClass} col-span-3 sm:col-span-1`}
                  aria-label={`Descripción de la línea ${i + 1}`}
                  aria-invalid={!!e.description}
                  placeholder="Descripción"
                  {...register(`items.${i}.description`)}
                />
                <input
                  className={inputClass}
                  aria-label={`Cantidad de la línea ${i + 1}`}
                  aria-invalid={!!e.quantity}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Cant."
                  {...register(`items.${i}.quantity`)}
                />
                <input
                  className={inputClass}
                  aria-label={`Precio de la línea ${i + 1}`}
                  aria-invalid={!!e.price}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Precio"
                  {...register(`items.${i}.price`)}
                />
                <button
                  type="button"
                  aria-label={`Quitar línea ${i + 1}`}
                  disabled={fields.length === 1}
                  onClick={() => onRemove(i)}
                  className="px-2 text-zinc-500 hover:text-red-600 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
              {messages.length > 0 && (
                <p role="alert" className="mt-1 text-xs text-red-700">
                  {messages.join(" · ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {errors?.root?.message && <p className="mt-1 text-xs text-red-700">{errors.root.message}</p>}
      <button type="button" onClick={onAdd} className="mt-3 text-sm font-medium text-brand hover:underline">
        + Agregar línea
      </button>
    </section>
  );
}

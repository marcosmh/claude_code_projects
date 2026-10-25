import { useId, useRef } from "react";
import { button } from "@/components/common/ui";

/** Botón "Eliminar" con diálogo de confirmación modal (`<dialog>` nativo: foco atrapado y Escape). */
export function DeleteInvoiceDialog({
  number,
  pending,
  onConfirm,
}: {
  number: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button type="button" disabled={pending} onClick={() => dialog.current?.showModal()} className={button("danger", "sm")}>
        {pending ? "Eliminando…" : "Eliminar"}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-md border border-zinc-300 bg-surface p-5 text-foreground backdrop:bg-black/40"
      >
        <h2 id={titleId} className="font-semibold">Eliminar {number}</h2>
        <p className="mt-2 text-sm text-zinc-600">Se borrarán la factura y sus líneas. Esta acción no se puede deshacer.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" autoFocus onClick={() => dialog.current?.close()} className={button("secondary", "sm")}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Eliminar factura
          </button>
        </div>
      </dialog>
    </>
  );
}

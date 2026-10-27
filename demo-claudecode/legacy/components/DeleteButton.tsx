"use client";

import { useRef, useTransition } from "react";
import { button } from "@/components/ui";
import { deleteInvoice } from "@/lib/actions/invoices";

export function DeleteButton({ id, number }: { id: number; number: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => dialog.current?.showModal()}
        className={button("danger", "sm")}
      >
        {pending ? "Eliminando…" : "Eliminar"}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`delete-${id}-title`}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-md border border-zinc-300 bg-surface p-5 text-foreground backdrop:bg-black/40"
      >
        <h2 id={`delete-${id}-title`} className="font-semibold">Eliminar {number}</h2>
        <p className="mt-2 text-sm text-zinc-600">Se borrarán la factura y sus líneas. Esta acción no se puede deshacer.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => dialog.current?.close()}
            className={button("secondary", "sm")}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.current?.close();
              start(() => deleteInvoice(id));
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

"use client";

import { useTransition } from "react";
import { deleteInvoice } from "@/lib/actions/invoices";

export function DeleteButton({ id, number }: { id: number; number: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`¿Eliminar la factura ${number}? Esta acción no se puede deshacer.`)) {
          start(() => deleteInvoice(id));
        }
      }}
      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}

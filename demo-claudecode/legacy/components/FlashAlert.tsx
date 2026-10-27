"use client";

import { useEffect, useState } from "react";
import type { Flash } from "@/lib/flash";

const AUTO_CLOSE_MS = 5000;

const STYLES: Record<Flash["type"], string> = {
  success: "border-green-700 text-foreground",
  error: "border-red-600 text-foreground",
};

/** Alerta flash arriba de la página: se cierra sola a los segundos o con el botón. */
export function FlashAlert({ flash }: { flash: Flash }) {
  const [open, setOpen] = useState(true);
  const [paused, setPaused] = useState(false);

  // Sincroniza con el servidor: el mensaje vive una sola solicitud.
  useEffect(() => {
    fetch("/flash", { method: "DELETE" }).catch(() => {});
  }, []);

  // Cierre automático; se detiene mientras el cursor o el foco están sobre la alerta.
  useEffect(() => {
    if (!open || paused) return;
    const timer = setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open, paused]);

  if (!open) return null;

  const success = flash.type === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`sticky top-14 z-20 mb-5 flex items-center gap-3 rounded-md border border-l-4 bg-surface px-4 py-3 text-sm shadow-sm ${STYLES[flash.type]}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className={`size-5 shrink-0 ${success ? "text-green-700" : "text-red-600"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {success ? <path d="m4.5 10.5 3.5 3.5 7.5-8" /> : <path d="M10 5.5v5.5M10 14.5h.01" />}
      </svg>
      <p className="flex-1">{flash.message}</p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Cerrar aviso"
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </div>
  );
}

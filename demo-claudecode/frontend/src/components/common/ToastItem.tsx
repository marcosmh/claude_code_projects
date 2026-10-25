import { useEffect, useState } from "react";
import type { Toast } from "@/store/toastStore";

export const AUTO_CLOSE_MS = 5000;

const BORDER: Record<Toast["type"], string> = {
  success: "border-green-700",
  error: "border-red-600",
};

/** Aviso flash: se cierra solo a los 5 s, se pausa con hover/foco y tiene botón de cierre. */
export function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const success = toast.type === "success";

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onClose(toast.id), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [paused, toast.id, onClose]);

  return (
    <div
      role={success ? "status" : "alert"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto flex items-center gap-3 rounded-md border border-l-4 bg-surface px-4 py-3 text-sm text-foreground shadow-lg ${BORDER[toast.type]}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className={`size-5 shrink-0 ${success ? "text-green-700" : "text-red-600"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {success ? <path d="m4.5 10.5 3.5 3.5 7.5-8" /> : <path d="M10 5.5v5.5M10 14.5h.01" />}
      </svg>
      <p className="flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
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

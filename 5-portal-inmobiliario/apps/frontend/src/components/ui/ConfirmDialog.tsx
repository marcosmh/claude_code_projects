"use client";

import { useEffect, useId, useRef } from "react";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Mientras la acción está en curso se deshabilitan ambos botones. */
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const buttonClassName =
  "rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

/**
 * Modal de confirmación accesible: el foco inicia en cancelar (la opción segura), Tab queda
 * dentro del diálogo, Esc o clic fuera cancelan y al cerrar el foco vuelve al elemento previo.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && !isBusy) {
      event.stopPropagation();
      onCancel();
    } else if (event.key === "Tab") {
      // Foco atrapado entre los dos botones.
      const first = cancelButtonRef.current;
      const last = confirmButtonRef.current;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onCancel();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-xl border border-foreground/10 bg-surface p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-foreground/80">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className={`${buttonClassName} border border-foreground/20 hover:bg-foreground/5`}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`${buttonClassName} bg-danger text-white hover:opacity-90`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

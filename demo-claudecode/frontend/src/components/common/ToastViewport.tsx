import { useToastStore } from "@/store/toastStore";
import { ToastItem } from "./ToastItem";

/** Contenedor global de avisos; se monta una vez en el layout, por eso sobrevive a la navegación. */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-4 top-16 z-50 mx-auto flex max-w-md flex-col gap-2 sm:left-auto sm:right-4 sm:mx-0 sm:w-96">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={dismiss} />
      ))}
    </div>
  );
}

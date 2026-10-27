import { useToastStore } from "@/store/toastStore";
import { ToastItem } from "./ToastItem";

/**
 * Contenedor global de avisos; se monta una vez en el layout, por eso sobrevive a la navegación.
 * Las dos regiones en vivo existen siempre (vacías): los lectores de pantalla solo anuncian de forma
 * fiable los cambios en una región que ya estaba en la página. Éxito es cortés (`status`), error asertivo (`alert`).
 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const render = (type: "success" | "error") =>
    toasts.filter((t) => t.type === type).map((t) => <ToastItem key={t.id} toast={t} onClose={dismiss} />);

  return (
    <div className="pointer-events-none fixed inset-x-4 top-16 z-50 mx-auto flex max-w-md flex-col gap-2 sm:left-auto sm:right-4 sm:mx-0 sm:w-96">
      <div role="alert" className="flex flex-col gap-2">
        {render("error")}
      </div>
      <div role="status" className="flex flex-col gap-2">
        {render("success")}
      </div>
    </div>
  );
}

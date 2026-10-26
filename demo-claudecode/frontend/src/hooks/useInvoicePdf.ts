import { useCallback, useState } from "react";
import { invoicesService } from "@/services/invoicesService";
import { useToastStore } from "@/store/toastStore";
import { errorMessage } from "@/utils/apiErrors";

const REVOKE_AFTER_MS = 60_000;

/**
 * Abre el PDF de una factura en una pestaña nueva. El PDF se descarga con `Authorization: Bearer` (un enlace directo
 * no la enviaría) y se muestra desde un blob. La pestaña se abre en el propio clic, antes de esperar a la red, para
 * que el bloqueador de ventanas emergentes no la impida.
 */
export function useInvoicePdf() {
  const push = useToastStore((s) => s.push);
  const [isPending, setIsPending] = useState(false);

  const open = useCallback(
    async (id: number) => {
      const tab = window.open("about:blank", "_blank");
      if (!tab) {
        push("error", "El navegador bloqueó la pestaña del PDF. Permite las ventanas emergentes e inténtalo de nuevo.");
        return;
      }
      tab.opener = null;
      setIsPending(true);
      try {
        const url = URL.createObjectURL(await invoicesService.pdf(id));
        tab.location.href = url;
        window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
      } catch (error) {
        tab.close();
        push("error", errorMessage(error, "No se pudo abrir el PDF. Inténtalo de nuevo."));
      } finally {
        setIsPending(false);
      }
    },
    [push],
  );

  return { open, isPending };
}

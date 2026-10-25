import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/apiClient";
import { invoicesService } from "@/services/invoicesService";
import { useToastStore } from "@/store/toastStore";
import type { InvoiceRequest, Status } from "@/types/invoice";
import { STATUS_LABELS } from "@/utils/status";
import { queryKeys } from "./queryKeys";

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : "Ocurrió un error inesperado. Inténtalo de nuevo.";

/** Altas, ediciones, cambios de estado y borrados; avisan con un toast y refrescan los datos. */
export function useInvoiceMutations() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
    ]);

  const create = useMutation({
    mutationFn: (input: InvoiceRequest) => invoicesService.create(input),
    onSuccess: async (invoice) => {
      push("success", `Factura ${invoice.number} creada.`);
      await refresh();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: InvoiceRequest }) => invoicesService.update(id, input),
    onSuccess: async (invoice) => {
      push("success", `Factura ${invoice.number} actualizada.`);
      await refresh();
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) => invoicesService.setStatus(id, status),
    onSuccess: async (invoice) => {
      push("success", `Factura ${invoice.number} marcada como ${STATUS_LABELS[invoice.status].toLowerCase()}.`);
      await refresh();
    },
    onError: (error) => push("error", errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: number; number: string }) => invoicesService.remove(id),
    // Sin `await`: la página navega a la lista de inmediato y el refresco ocurre en segundo plano.
    onSuccess: (_data, { id, number }) => {
      push("success", `Factura ${number} eliminada.`);
      queryClient.removeQueries({ queryKey: queryKeys.invoice(id) });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.invoices, "list"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
    onError: (error) => push("error", errorMessage(error)),
  });

  return { create, update, changeStatus, remove };
}

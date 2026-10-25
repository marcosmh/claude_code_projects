import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/services/apiClient";
import { invoicesService } from "@/services/invoicesService";
import { queryKeys } from "./queryKeys";

/** `id` es `null` cuando el parámetro de la ruta no es un entero positivo. */
export function useInvoice(id: number | null) {
  return useQuery({
    queryKey: queryKeys.invoice(id ?? 0),
    queryFn: ({ signal }) => invoicesService.get(id as number, signal),
    enabled: id !== null,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500 && error.status !== 0) && count < 2,
  });
}

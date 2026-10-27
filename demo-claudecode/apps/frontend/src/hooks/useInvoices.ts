import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { invoicesService } from "@/services/invoicesService";
import type { InvoiceListParams } from "@/types/invoice";
import { queryKeys } from "./queryKeys";

export function useInvoices(params: InvoiceListParams) {
  return useQuery({
    queryKey: queryKeys.invoiceList(params),
    queryFn: ({ signal }) => invoicesService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

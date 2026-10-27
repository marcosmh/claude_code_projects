import { useSearchParams } from "react-router";
import type { InvoiceListParams, Status } from "@/types/invoice";
import { isStatus } from "@/utils/status";

export const PAGE_SIZE = 10;

/** Filtros, búsqueda y página viven en la URL (`?status=&q=&page=`) para poder compartirlos. */
export function useInvoiceFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = (searchParams.get("q") ?? "").trim();
  const rawStatus = searchParams.get("status");
  const status: Status | undefined = isStatus(rawStatus) ? rawStatus : undefined;
  const pageNumber = Number(searchParams.get("page"));
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1;

  const update = (next: { q?: string; status?: Status | ""; page?: number }) => {
    const params = new URLSearchParams(searchParams);
    const apply = (key: string, value: string | number | undefined) => {
      if (value === undefined || value === "" || (value === 1 && key === "page")) params.delete(key);
      else params.set(key, String(value));
    };
    if ("q" in next) apply("q", next.q?.trim());
    if ("status" in next) apply("status", next.status);
    apply("page", "page" in next ? next.page : undefined);
    setSearchParams(params);
  };

  const apiParams: InvoiceListParams = { status, search: q || undefined, page, pageSize: PAGE_SIZE };
  return { q, status, page, apiParams, update };
}

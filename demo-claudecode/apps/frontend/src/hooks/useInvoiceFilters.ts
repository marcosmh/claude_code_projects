import { toCents } from "@invoices/shared-utils";
import { useSearchParams } from "react-router";
import { isCurrency } from "@invoices/shared-types";
import type { Currency, InvoiceListParams, Status } from "@/types/invoice";
import { STATUSES } from "@/utils/status";

export const PAGE_SIZE = 10;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const date = (raw: string | null) => (raw && DATE.test(raw) ? raw : "");
/** Importe en unidades de moneda (`1500.50`) como texto; vacío si no es un número >= 0. */
const amount = (raw: string | null) => (raw !== null && raw.trim() !== "" && Number.isFinite(Number(raw)) && Number(raw) >= 0 ? raw.trim() : "");

export interface InvoiceFilterUpdate {
  q?: string;
  /** Un solo estado (pestañas); "" quita el filtro de estado. */
  status?: Status | "";
  /** Varios estados (barra lateral). */
  statuses?: Status[];
  from?: string;
  to?: string;
  currency?: Currency | "";
  min?: string;
  max?: string;
  page?: number;
}

const PARAM: Record<Exclude<keyof InvoiceFilterUpdate, "status" | "statuses" | "page">, string> = {
  q: "q",
  from: "from",
  to: "to",
  currency: "currency",
  min: "min",
  max: "max",
};

/**
 * Búsqueda, filtros y página viven en la URL
 * (`?q=&status=DRAFT,SENT&from=&to=&currency=&min=&max=&page=`) para poder compartirlos.
 */
export function useInvoiceFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = (searchParams.get("q") ?? "").trim();
  const requested = (searchParams.get("status") ?? "").split(",");
  const statuses = STATUSES.filter((s) => requested.includes(s));
  const status: Status | undefined = statuses.length === 1 ? statuses[0] : undefined;
  const from = date(searchParams.get("from"));
  const to = date(searchParams.get("to"));
  const rawCurrency = searchParams.get("currency");
  const currency: Currency | "" = rawCurrency && isCurrency(rawCurrency) ? rawCurrency : "";
  const min = amount(searchParams.get("min"));
  const max = amount(searchParams.get("max"));
  const pageNumber = Number(searchParams.get("page"));
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1;

  /** Cuántos grupos de la barra lateral están activos (estado, fechas, importe). */
  const sidebarActive = (statuses.length > 0 ? 1 : 0) + (from || to ? 1 : 0) + (currency || min || max ? 1 : 0);
  const hasFilters = Boolean(q) || sidebarActive > 0;

  const update = (next: InvoiceFilterUpdate) => {
    const params = new URLSearchParams(searchParams);
    const apply = (key: string, value: string | number | undefined) => {
      if (value === undefined || value === "" || (value === 1 && key === "page")) params.delete(key);
      else params.set(key, String(value));
    };
    if ("q" in next) apply("q", next.q?.trim());
    if ("status" in next) apply("status", next.status);
    if ("statuses" in next) apply("status", STATUSES.filter((s) => next.statuses?.includes(s)).join(","));
    for (const key of Object.keys(PARAM) as (keyof typeof PARAM)[]) {
      if (key !== "q" && key in next) apply(PARAM[key], next[key]);
    }
    apply("page", "page" in next ? next.page : undefined);
    setSearchParams(params);
  };

  /** Quita los filtros de la barra lateral; la búsqueda se conserva. */
  const clearSidebar = () => update({ statuses: [], from: "", to: "", currency: "", min: "", max: "" });

  // Los importes solo tienen sentido con moneda, y un rango invertido se ignora para no provocar un 400 al editar la URL a mano.
  const dateRangeOk = !from || !to || from <= to;
  const amountsOk = Boolean(currency) && (!min || !max || Number(min) <= Number(max));
  const apiParams: InvoiceListParams = {
    status: statuses.length > 0 ? statuses : undefined,
    search: q || undefined,
    issuedFrom: from || undefined,
    issuedTo: dateRangeOk ? to || undefined : undefined,
    currency: currency || undefined,
    minTotalCents: amountsOk && min ? toCents(Number(min)) : undefined,
    maxTotalCents: amountsOk && max ? toCents(Number(max)) : undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  return { q, status, statuses, from, to, currency, min, max, page, sidebarActive, hasFilters, apiParams, update, clearSidebar };
}

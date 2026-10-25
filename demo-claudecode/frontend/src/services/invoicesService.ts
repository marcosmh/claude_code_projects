import type { Invoice, InvoiceListParams, InvoiceRequest, PageMeta, Paginated, Status } from "@/types/invoice";
import { buildUrl, request } from "./apiClient";

export const invoicesService = {
  async list(params: InvoiceListParams, signal?: AbortSignal): Promise<Paginated<Invoice>> {
    const { data, meta } = await request<Invoice[], PageMeta>("/invoices", {
      query: { ...params },
      signal,
    });
    return {
      items: data,
      meta: meta ?? { page: 1, pageSize: data.length, total: data.length, totalPages: 1 },
    };
  },

  async get(id: number, signal?: AbortSignal): Promise<Invoice> {
    return (await request<Invoice>(`/invoices/${id}`, { signal })).data;
  },

  async create(input: InvoiceRequest): Promise<Invoice> {
    return (await request<Invoice>("/invoices", { method: "POST", body: input })).data;
  },

  async update(id: number, input: InvoiceRequest): Promise<Invoice> {
    return (await request<Invoice>(`/invoices/${id}`, { method: "PUT", body: input })).data;
  },

  async setStatus(id: number, status: Status): Promise<Invoice> {
    return (await request<Invoice>(`/invoices/${id}/status`, { method: "PATCH", body: { status } })).data;
  },

  async remove(id: number): Promise<void> {
    await request<void>(`/invoices/${id}`, { method: "DELETE" });
  },

  /** URL del PDF servido por el backend; se abre en una pestaña nueva. */
  pdfUrl(id: number): string {
    return buildUrl(`/invoices/${id}/pdf`);
  },
};

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import { invoicesService } from "@/services/invoicesService";
import { useToastStore } from "@/store/toastStore";
import type { Invoice, InvoiceRequest } from "@/types/invoice";
import { useInvoiceMutations } from "./useInvoiceMutations";

vi.mock("@/services/invoicesService", () => ({
  invoicesService: { create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn() },
}));

const svc = vi.mocked(invoicesService);
const invoice = (over: Partial<Invoice> = {}) => ({ id: 1, number: "FAC-0001", status: "DRAFT", ...over }) as Invoice;
const input = {} as InvoiceRequest;

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
  vi.resetAllMocks();
  useToastStore.setState({ toasts: [] });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

const messages = () => useToastStore.getState().toasts.map((t) => [t.type, t.message]);

describe("useInvoiceMutations", () => {
  it("create avisa y refresca facturas y estadísticas", async () => {
    svc.create.mockResolvedValue(invoice());
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useInvoiceMutations(), { wrapper });

    await act(() => result.current.create.mutateAsync(input));

    expect(messages()).toEqual([["success", "Factura FAC-0001 creada."]]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["invoices"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["stats"] });
  });

  it("update avisa con el número de factura", async () => {
    svc.update.mockResolvedValue(invoice({ number: "FAC-0009" }));
    const { result } = renderHook(() => useInvoiceMutations(), { wrapper });

    await act(() => result.current.update.mutateAsync({ id: 9, input }));

    expect(svc.update).toHaveBeenCalledWith(9, input);
    expect(messages()).toEqual([["success", "Factura FAC-0009 actualizada."]]);
  });

  it("create y update no avisan de error por sí mismos (lo hace el formulario)", async () => {
    svc.create.mockRejectedValue(new ApiError(422, "X", "mal"));
    const { result } = renderHook(() => useInvoiceMutations(), { wrapper });

    await act(async () => {
      await result.current.create.mutateAsync(input).catch(() => undefined);
    });

    expect(messages()).toEqual([]);
  });

  it("changeStatus avisa del nuevo estado en minúsculas", async () => {
    svc.setStatus.mockResolvedValue(invoice({ status: "PAID" }));
    const { result } = renderHook(() => useInvoiceMutations(), { wrapper });

    await act(() => result.current.changeStatus.mutateAsync({ id: 1, status: "PAID" }));

    expect(messages()).toEqual([["success", "Factura FAC-0001 marcada como pagada."]]);
  });

  it("changeStatus muestra el mensaje de la API si falla", async () => {
    svc.setStatus.mockRejectedValue(new ApiError(409, "CONFLICT", "Transición no permitida"));
    const { result } = renderHook(() => useInvoiceMutations(), { wrapper });

    act(() => result.current.changeStatus.mutate({ id: 1, status: "PAID" }));

    await waitFor(() => expect(messages()).toEqual([["error", "Transición no permitida"]]));
  });

  it("remove avisa, elimina el detalle de la caché e invalida listas y estadísticas", async () => {
    svc.remove.mockResolvedValue(undefined);
    client.setQueryData(["invoices", "detail", 1], invoice());
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useInvoiceMutations(), { wrapper });

    await act(() => result.current.remove.mutateAsync({ id: 1, number: "FAC-0001" }));

    expect(messages()).toEqual([["success", "Factura FAC-0001 eliminada."]]);
    expect(client.getQueryData(["invoices", "detail", 1])).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["invoices", "list"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["stats"] });
  });

  it("remove usa un mensaje genérico si el error no es de la API", async () => {
    svc.remove.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useInvoiceMutations(), { wrapper });

    act(() => result.current.remove.mutate({ id: 1, number: "FAC-0001" }));

    await waitFor(() => expect(messages()).toEqual([["error", "Ocurrió un error inesperado. Inténtalo de nuevo."]]));
  });
});

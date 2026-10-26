import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import { invoicesService } from "@/services/invoicesService";
import { useToastStore } from "@/store/toastStore";
import type { Invoice } from "@/types/invoice";
import { InvoiceDetailPage } from "./InvoiceDetailPage";

vi.mock("@/services/invoicesService", () => ({
  invoicesService: { get: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), pdf: vi.fn() },
}));
const svc = vi.mocked(invoicesService);

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: 3,
  number: "FAC-0003",
  clientName: "Acme SA",
  clientEmail: "acme@example.com",
  clientAddress: "Calle 1",
  issueDate: "2026-10-01T00:00:00.000Z",
  dueDate: "2026-10-20T00:00:00.000Z",
  status: "DRAFT",
  isOverdue: false,
  taxRate: 16,
  notes: "Gracias por su compra",
  items: [{ id: 1, description: "Servicio", quantity: 2, unitPriceCents: 5000, amountCents: 10000 }],
  subtotalCents: 10000,
  taxCents: 1600,
  totalCents: 11600,
  createdAt: "",
  updatedAt: "",
  ...over,
});

function renderPage(url = "/invoices/3") {
  const router = createMemoryRouter(
    [
      { path: "/invoices/:id", element: <InvoiceDetailPage /> },
      { path: "/invoices", element: <p>Lista de facturas</p> },
    ],
    { initialEntries: [url] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.resetAllMocks();
  useToastStore.setState({ toasts: [] });
});

describe("InvoiceDetailPage", () => {
  it("muestra el esqueleto mientras carga", () => {
    svc.get.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
  });

  it("muestra cliente, fechas, líneas, notas y totales", async () => {
    svc.get.mockResolvedValue(invoice());
    renderPage();

    expect(await screen.findByRole("heading", { name: "FAC-0003" })).toBeInTheDocument();
    expect(screen.getByText("Acme SA")).toBeInTheDocument();
    expect(screen.getByText("acme@example.com")).toBeInTheDocument();
    expect(screen.getByText("Calle 1")).toBeInTheDocument();
    expect(screen.getByText("1 oct 2026")).toBeInTheDocument();
    expect(screen.getByText("20 oct 2026")).toBeInTheDocument();
    const row = screen.getByRole("row", { name: /Servicio/ });
    expect(row).toHaveTextContent("50,00");
    expect(row).toHaveTextContent("100,00");
    expect(screen.getByText("Gracias por su compra")).toBeInTheDocument();
    expect(screen.getByText("Impuesto (16%)").nextElementSibling).toHaveTextContent("16,00");
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("116,00");
    expect(document.title).toBe("FAC-0003 · Facturas");
  });

  it("omite email y dirección vacíos y marca la factura vencida", async () => {
    svc.get.mockResolvedValue(invoice({ clientEmail: null, clientAddress: null, status: "SENT", isOverdue: true }));
    renderPage();

    await screen.findByRole("heading", { name: "FAC-0003" });
    expect(screen.queryByText("acme@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("Vencida")).toBeInTheDocument();
  });

  it("Ver PDF descarga el PDF con sesión y lo abre en una pestaña nueva", async () => {
    svc.get.mockResolvedValue(invoice());
    svc.pdf.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    const tab = { opener: "x" as unknown, location: { href: "" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    URL.createObjectURL = vi.fn(() => "blob:pdf-1");
    URL.revokeObjectURL = vi.fn();
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Ver PDF" }));

    await vi.waitFor(() => expect(tab.location.href).toBe("blob:pdf-1"));
    expect(svc.pdf).toHaveBeenCalledWith(3);
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.opener).toBeNull();
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute("href", "/invoices/3/edit");
  });

  it("si el PDF falla, cierra la pestaña y avisa", async () => {
    svc.get.mockResolvedValue(invoice());
    svc.pdf.mockRejectedValue(new ApiError(404, "NOT_FOUND", "No existe"));
    const tab = { opener: null, location: { href: "" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Ver PDF" }));

    await vi.waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(useToastStore.getState().toasts[0]).toMatchObject({ type: "error", message: "No existe" });
  });

  it("si el navegador bloquea la pestaña, avisa sin descargar", async () => {
    svc.get.mockResolvedValue(invoice());
    vi.spyOn(window, "open").mockReturnValue(null);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Ver PDF" }));

    expect(useToastStore.getState().toasts[0]?.message).toMatch(/bloqueó la pestaña/);
    expect(svc.pdf).not.toHaveBeenCalled();
  });

  it.each([
    ["DRAFT", "Marcar como enviada", "SENT"],
    ["SENT", "Marcar como pagada", "PAID"],
  ] as const)("desde %s ofrece «%s» y lo aplica con un aviso", async (status, label, next) => {
    svc.get.mockResolvedValue(invoice({ status }));
    svc.setStatus.mockResolvedValue(invoice({ status: next }));
    const user = renderPage();

    await user.click(await screen.findByRole("button", { name: label }));

    expect(svc.setStatus).toHaveBeenCalledWith(3, next);
    await vi.waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1));
    expect(useToastStore.getState().toasts[0]).toMatchObject({ type: "success" });
  });

  it("una factura pagada no ofrece cambio de estado", async () => {
    svc.get.mockResolvedValue(invoice({ status: "PAID" }));
    renderPage();
    await screen.findByRole("heading", { name: "FAC-0003" });
    expect(screen.queryByRole("button", { name: /Marcar como/ })).not.toBeInTheDocument();
  });

  it("deshabilita el botón de estado mientras la mutación está en curso", async () => {
    svc.get.mockResolvedValue(invoice());
    svc.setStatus.mockReturnValue(new Promise(() => undefined));
    const user = renderPage();

    await user.click(await screen.findByRole("button", { name: "Marcar como enviada" }));

    expect(await screen.findByRole("button", { name: "Marcando…" })).toBeDisabled();
  });

  it("si el cambio de estado falla avisa con un toast de error", async () => {
    svc.get.mockResolvedValue(invoice());
    svc.setStatus.mockRejectedValue(new ApiError(409, "CONFLICT", "Transición no permitida"));
    const user = renderPage();

    await user.click(await screen.findByRole("button", { name: "Marcar como enviada" }));

    await vi.waitFor(() => expect(useToastStore.getState().toasts).toEqual([expect.objectContaining({ type: "error", message: "Transición no permitida" })]));
  });

  it("eliminar pide confirmación, borra y vuelve a la lista", async () => {
    svc.get.mockResolvedValue(invoice());
    svc.remove.mockResolvedValue(undefined);
    const user = renderPage();

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("dialog", { name: "Eliminar FAC-0003" });
    await user.click(within(dialog).getByRole("button", { name: "Eliminar factura" }));

    expect(svc.remove).toHaveBeenCalledWith(3);
    expect(await screen.findByText("Lista de facturas")).toBeInTheDocument();
    expect(useToastStore.getState().toasts[0]?.message).toBe("Factura FAC-0003 eliminada.");
  });

  it("si el borrado falla se queda en la página y avisa", async () => {
    svc.get.mockResolvedValue(invoice());
    svc.remove.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "No se pudo borrar"));
    const user = renderPage();

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Eliminar factura" }));

    await vi.waitFor(() => expect(useToastStore.getState().toasts[0]).toMatchObject({ type: "error", message: "No se pudo borrar" }));
    expect(screen.queryByText("Lista de facturas")).not.toBeInTheDocument();
  });

  it("un id no numérico muestra «no encontrada» sin llamar a la API", async () => {
    renderPage("/invoices/abc");
    expect(await screen.findByRole("heading", { name: "No encontramos esa página" })).toBeInTheDocument();
    expect(svc.get).not.toHaveBeenCalled();
  });

  it("un 404 de la API muestra «no encontrada»", async () => {
    svc.get.mockRejectedValue(new ApiError(404, "NOT_FOUND", "No existe"));
    renderPage("/invoices/99");
    expect(await screen.findByRole("heading", { name: "No encontramos esa página" })).toBeInTheDocument();
  });

  it("un error del servidor muestra el mensaje y reintenta", async () => {
    svc.get.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Error interno"));
    const user = renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
    svc.get.mockResolvedValue(invoice());
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "FAC-0003" })).toBeInTheDocument();
  });
});

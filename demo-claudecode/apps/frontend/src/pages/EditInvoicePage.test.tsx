import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import { invoicesService } from "@/services/invoicesService";
import { useToastStore } from "@/store/toastStore";
import type { Invoice } from "@/types/invoice";
import { EditInvoicePage } from "./EditInvoicePage";

vi.mock("@/services/invoicesService", () => ({ invoicesService: { get: vi.fn(), update: vi.fn() } }));
const svc = vi.mocked(invoicesService);

const invoice = (): Invoice => ({
  id: 3,
  number: "FAC-0003",
  clientName: "Acme SA",
  clientEmail: null,
  clientAddress: null,
  issueDate: "2026-10-01T00:00:00.000Z",
  dueDate: "2026-10-20T00:00:00.000Z",
  status: "SENT",
  isOverdue: false,
  taxRate: 16,
  notes: null,
  items: [{ id: 1, description: "Servicio", quantity: 2, unitPriceCents: 5000, amountCents: 10000 }],
  subtotalCents: 10000,
  taxCents: 1600,
  totalCents: 11600,
  createdAt: "",
  updatedAt: "",
});

function renderPage(url = "/invoices/3/edit") {
  const router = createMemoryRouter(
    [
      { path: "/invoices/:id/edit", element: <EditInvoicePage /> },
      { path: "/invoices/:id", element: <p>Detalle de factura</p> },
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

describe("EditInvoicePage", () => {
  it("muestra el esqueleto mientras carga", () => {
    svc.get.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
  });

  it("precarga el formulario con la factura y enlaza migas y cancelar al detalle", async () => {
    svc.get.mockResolvedValue(invoice());
    renderPage();

    expect(await screen.findByRole("heading", { name: "Editar FAC-0003" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Cliente/)).toHaveValue("Acme SA");
    expect(screen.getByLabelText("Estado")).toHaveValue("SENT");
    expect(screen.getByLabelText("Precio de la línea 1")).toHaveValue(50);
    expect(screen.getByRole("link", { name: "FAC-0003" })).toHaveAttribute("href", "/invoices/3");
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute("href", "/invoices/3");
    expect(document.title).toBe("Editar FAC-0003 · Facturas");
  });

  it("guarda los cambios, avisa y vuelve al detalle", async () => {
    svc.get.mockResolvedValue(invoice());
    svc.update.mockResolvedValue(invoice());
    const user = renderPage();
    const client = await screen.findByLabelText(/^Cliente/);

    await user.clear(client);
    await user.type(client, "Beta SL");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Detalle de factura")).toBeInTheDocument();
    expect(svc.update).toHaveBeenCalledWith(3, expect.objectContaining({ clientName: "Beta SL", status: "SENT", taxRate: 16 }));
    expect(useToastStore.getState().toasts[0]?.message).toBe("Factura FAC-0003 actualizada.");
  });

  it("si el servidor rechaza los cambios muestra el error en el formulario y no navega", async () => {
    svc.get.mockResolvedValue(invoice());
    svc.update.mockRejectedValue(new ApiError(422, "UNPROCESSABLE_ENTITY", "Regla incumplida", [{ field: "dueDate", message: "Vencimiento inválido" }]));
    const user = renderPage();

    await user.click(await screen.findByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Vencimiento inválido")).toBeInTheDocument();
    expect(screen.queryByText("Detalle de factura")).not.toBeInTheDocument();
  });

  it("un id inválido o un 404 muestran «no encontrada»", async () => {
    renderPage("/invoices/0/edit");
    expect(await screen.findByRole("heading", { name: "No encontramos esa página" })).toBeInTheDocument();
    expect(svc.get).not.toHaveBeenCalled();
  });

  it("un 404 de la API muestra «no encontrada»", async () => {
    svc.get.mockRejectedValue(new ApiError(404, "NOT_FOUND", "No existe"));
    renderPage("/invoices/9/edit");
    expect(await screen.findByRole("heading", { name: "No encontramos esa página" })).toBeInTheDocument();
  });

  it("un error del servidor permite reintentar", async () => {
    svc.get.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Error interno"));
    const user = renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
    svc.get.mockResolvedValue(invoice());
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Editar FAC-0003" })).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import { invoicesService } from "@/services/invoicesService";
import { useToastStore } from "@/store/toastStore";
import type { Invoice } from "@/types/invoice";
import { NewInvoicePage } from "./NewInvoicePage";

vi.mock("@/services/invoicesService", () => ({ invoicesService: { create: vi.fn() } }));
const svc = vi.mocked(invoicesService);

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: "/invoices/new", element: <NewInvoicePage /> },
      { path: "/invoices/:id", element: <p>Detalle de factura</p> },
      { path: "/invoices", element: <p>Lista de facturas</p> },
    ],
    { initialEntries: ["/invoices/new"] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), router };
}

beforeEach(() => {
  vi.resetAllMocks();
  useToastStore.setState({ toasts: [] });
});

describe("NewInvoicePage", () => {
  it("muestra el formulario vacío con migas y título", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Nueva factura" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Cliente/)).toHaveValue("");
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute("href", "/invoices");
    expect(document.title).toBe("Nueva factura · Facturas");
  });

  it("no envía un formulario inválido", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("El cliente es obligatorio")).toBeInTheDocument();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it("crea la factura, avisa y navega a su detalle", async () => {
    svc.create.mockResolvedValue({ id: 8, number: "FAC-0008" } as Invoice);
    const { user, router } = renderPage();

    await user.type(screen.getByLabelText(/^Cliente/), "Acme SA");
    await user.type(screen.getByLabelText("Descripción de la línea 1"), "Servicio");
    await user.type(screen.getByLabelText("Precio de la línea 1"), "10");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Detalle de factura")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/invoices/8");
    expect(svc.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientName: "Acme SA", items: [{ description: "Servicio", quantity: 1, unitPriceCents: 1000 }] }),
    );
    expect(useToastStore.getState().toasts[0]?.message).toBe("Factura FAC-0008 creada.");
  });

  it("si la API rechaza, se queda en el formulario con el mensaje", async () => {
    svc.create.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Error interno"));
    const { user } = renderPage();

    await user.type(screen.getByLabelText(/^Cliente/), "Acme SA");
    await user.type(screen.getByLabelText("Descripción de la línea 1"), "Servicio");
    await user.type(screen.getByLabelText("Precio de la línea 1"), "10");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Error interno");
    expect(screen.queryByText("Detalle de factura")).not.toBeInTheDocument();
  });
});

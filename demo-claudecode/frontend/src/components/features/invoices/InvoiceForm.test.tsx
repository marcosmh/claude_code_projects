import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import type { InvoiceRequest } from "@/types/invoice";
import { emptyInvoiceForm, type InvoiceFormValues } from "@/utils/invoiceForm";
import { InvoiceForm } from "./InvoiceForm";

const filled = (): InvoiceFormValues => ({
  ...emptyInvoiceForm(),
  clientName: "Acme SA",
  issueDate: "2026-10-01",
  dueDate: "2026-10-20",
  taxRate: "16",
  items: [{ description: "Servicio", quantity: "2", price: "50.00" }],
});

function setup(initial: InvoiceFormValues, onSubmit: (i: InvoiceRequest) => Promise<unknown>) {
  render(
    <MemoryRouter>
      <InvoiceForm initial={initial} onSubmit={onSubmit} cancelTo="/invoices" />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe("InvoiceForm", () => {
  it("muestra errores de validación en español y no envía", async () => {
    const onSubmit = vi.fn();
    const user = setup(emptyInvoiceForm(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("El cliente es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("La descripción es obligatoria")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envía el cuerpo de la API con centavos y nulos", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = setup(filled(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      clientName: "Acme SA",
      clientEmail: null,
      clientAddress: null,
      issueDate: "2026-10-01",
      dueDate: "2026-10-20",
      status: "DRAFT",
      taxRate: 16,
      notes: null,
      items: [{ description: "Servicio", quantity: 2, unitPriceCents: 5000 }],
    });
  });

  it("calcula la vista previa de totales", () => {
    setup(filled(), vi.fn());
    expect(screen.getByLabelText("Vista previa de totales")).toHaveTextContent("116,00");
  });

  it("muestra los errores del servidor por campo y generales", async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(422, "UNPROCESSABLE_ENTITY", "La factura incumple reglas de negocio", [
        { field: "dueDate", message: "El vencimiento no puede ser anterior a la emisión" },
        { field: "items.0.quantity", message: "La cantidad debe ser mayor que 0" },
        { message: "Regla general" },
      ]),
    );
    const user = setup(filled(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("El vencimiento no puede ser anterior a la emisión")).toBeInTheDocument();
    expect(screen.getByLabelText("Vencimiento")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("La cantidad debe ser mayor que 0")).toBeInTheDocument();
    expect(screen.getByText("Regla general")).toBeInTheDocument();
  });

  it("muestra el mensaje del servidor si no hay detalles", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(0, "NETWORK_ERROR", "No se pudo conectar con el servidor."));
    const user = setup(filled(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
  });
});

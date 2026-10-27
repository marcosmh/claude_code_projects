import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeleteInvoiceDialog } from "./DeleteInvoiceDialog";

describe("DeleteInvoiceDialog", () => {
  it("el diálogo está cerrado hasta pulsar Eliminar", async () => {
    render(<DeleteInvoiceDialog number="FAC-0003" pending={false} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(screen.getByRole("dialog", { name: "Eliminar FAC-0003" })).toBeInTheDocument();
  });

  it("Cancelar cierra sin confirmar", async () => {
    const onConfirm = vi.fn();
    render(<DeleteInvoiceDialog number="FAC-0003" pending={false} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Eliminar factura cierra y confirma una vez", async () => {
    const onConfirm = vi.fn();
    render(<DeleteInvoiceDialog number="FAC-0003" pending={false} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await userEvent.click(screen.getByRole("button", { name: "Eliminar factura" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("mientras está pendiente el botón se deshabilita y cambia el texto", () => {
    render(<DeleteInvoiceDialog number="FAC-0003" pending onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Eliminando…" })).toBeDisabled();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

afterEach(cleanup);

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="¿Eliminar esta consulta?"
      description="Esta acción no se puede deshacer."
      confirmLabel="Sí, eliminar"
      cancelLabel="No, cancelar"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("muestra el mensaje con nombre y descripción accesibles", () => {
    renderDialog();
    const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar esta consulta?" });
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Esta acción no se puede deshacer.")).toBeTruthy();
  });

  it("enfoca «No, cancelar» al abrir", () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "No, cancelar" }));
  });

  it("confirma con «Sí, eliminar»", () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancela con el botón, con Esc y con clic fuera", () => {
    const { onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "No, cancelar" }));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    fireEvent.mouseDown(screen.getByRole("alertdialog").parentElement as HTMLElement);
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it("no cancela por clic dentro del diálogo y bloquea los botones si está ocupado", () => {
    const { onCancel } = renderDialog({ isBusy: true });
    fireEvent.mouseDown(screen.getByRole("alertdialog"));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: "Sí, eliminar" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToastStore } from "@/store/toastStore";
import { AUTO_CLOSE_MS } from "./ToastItem";
import { ToastViewport } from "./ToastViewport";

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});
afterEach(() => vi.useRealTimers());

const push = (type: "success" | "error", message: string) => act(() => useToastStore.getState().push(type, message));

describe("Toast", () => {
  it("usa role status para éxito y alert para error", () => {
    render(<ToastViewport />);
    push("success", "Factura FAC-0001 creada.");
    push("error", "Algo falló");

    expect(screen.getByRole("status")).toHaveTextContent("Factura FAC-0001 creada.");
    expect(screen.getByRole("alert")).toHaveTextContent("Algo falló");
  });

  it("se cierra solo a los 5 segundos", () => {
    render(<ToastViewport />);
    push("success", "Hecho");

    act(() => vi.advanceTimersByTime(AUTO_CLOSE_MS - 1));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("se pausa con hover y reanuda al salir", () => {
    render(<ToastViewport />);
    push("success", "Hecho");
    const toast = screen.getByRole("status");

    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(AUTO_CLOSE_MS * 3));
    expect(screen.getByRole("status")).toBeInTheDocument();

    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(AUTO_CLOSE_MS));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("se pausa con el foco", () => {
    render(<ToastViewport />);
    push("success", "Hecho");

    fireEvent.focus(screen.getByRole("button", { name: "Cerrar aviso" }));
    act(() => vi.advanceTimersByTime(AUTO_CLOSE_MS * 2));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("se cierra con el botón", () => {
    render(<ToastViewport />);
    push("success", "Hecho");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

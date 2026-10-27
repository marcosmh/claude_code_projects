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
  it("las regiones en vivo existen antes de que haya avisos (así se anuncian los que llegan)", () => {
    render(<ToastViewport />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("éxito se anuncia en la región status y error en la región alert", () => {
    render(<ToastViewport />);
    push("success", "Factura FAC-0001 creada.");
    push("error", "Algo falló");

    expect(screen.getByRole("status")).toHaveTextContent("Factura FAC-0001 creada.");
    expect(screen.getByRole("status")).not.toHaveTextContent("Algo falló");
    expect(screen.getByRole("alert")).toHaveTextContent("Algo falló");
  });

  it("se cierra solo a los 5 segundos", () => {
    render(<ToastViewport />);
    push("success", "Hecho");

    act(() => vi.advanceTimersByTime(AUTO_CLOSE_MS - 1));
    expect(screen.getByText("Hecho")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("Hecho")).not.toBeInTheDocument();
  });

  it("se pausa con hover y reanuda al salir", () => {
    render(<ToastViewport />);
    push("success", "Hecho");
    const toast = screen.getByText("Hecho").closest("div")!;

    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(AUTO_CLOSE_MS * 3));
    expect(screen.getByText("Hecho")).toBeInTheDocument();

    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(AUTO_CLOSE_MS));
    expect(screen.queryByText("Hecho")).not.toBeInTheDocument();
  });

  it("se pausa con el foco", () => {
    render(<ToastViewport />);
    push("success", "Hecho");

    fireEvent.focus(screen.getByRole("button", { name: "Cerrar aviso" }));
    act(() => vi.advanceTimersByTime(AUTO_CLOSE_MS * 2));
    expect(screen.getByText("Hecho")).toBeInTheDocument();
  });

  it("se cierra con el botón", () => {
    render(<ToastViewport />);
    push("success", "Hecho");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText("Hecho")).not.toBeInTheDocument();
  });

  it("muestra como mucho 3 avisos: al llegar el cuarto se va el más antiguo", () => {
    render(<ToastViewport />);
    for (const n of [1, 2, 3, 4]) push("success", `Aviso ${n}`);

    expect(screen.queryByText("Aviso 1")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Aviso \d/).map((e) => e.textContent)).toEqual(["Aviso 2", "Aviso 3", "Aviso 4"]);
  });
});

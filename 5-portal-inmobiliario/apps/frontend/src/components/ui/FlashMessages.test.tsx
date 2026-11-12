// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLASH_DURATION_MS, useFlashStore } from "@/stores/flashStore";
import { FlashMessages } from "./FlashMessages";

describe("FlashMessages", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useFlashStore.setState({ messages: [] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("no renderiza nada sin mensajes", () => {
    const { container } = render(<FlashMessages />);
    expect(container.firstChild).toBeNull();
  });

  it("muestra éxito como status y error como alert", () => {
    render(<FlashMessages />);
    act(() => {
      useFlashStore.getState().show("success", "Guardado");
      useFlashStore.getState().show("error", "Falló");
    });
    expect(screen.getByRole("status").textContent).toContain("Guardado");
    expect(screen.getByRole("alert").textContent).toContain("Falló");
  });

  it("desaparece solo a los 5 segundos", () => {
    render(<FlashMessages />);
    act(() => useFlashStore.getState().show("info", "Aviso"));
    act(() => vi.advanceTimersByTime(FLASH_DURATION_MS - 1));
    expect(screen.queryByRole("status")).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("se pausa mientras el cursor está encima", async () => {
    render(<FlashMessages />);
    act(() => useFlashStore.getState().show("info", "Aviso"));
    fireEvent.mouseEnter(screen.getByRole("status"));
    act(() => vi.advanceTimersByTime(FLASH_DURATION_MS * 2));
    expect(screen.queryByRole("status")).not.toBeNull();
    fireEvent.mouseLeave(screen.getByRole("status"));
    act(() => vi.advanceTimersByTime(FLASH_DURATION_MS));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("se cierra con el botón «Cerrar mensaje»", async () => {
    render(<FlashMessages />);
    act(() => useFlashStore.getState().show("success", "Hecho"));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar mensaje" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

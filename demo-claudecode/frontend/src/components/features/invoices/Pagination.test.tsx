import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

const meta = (page: number, totalPages: number) => ({ page, pageSize: 10, total: 25, totalPages });

describe("Pagination", () => {
  it("no se muestra con una sola página", () => {
    const { container } = render(<Pagination meta={meta(1, 1)} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra la posición y navega a la página siguiente", async () => {
    const onPageChange = vi.fn();
    render(<Pagination meta={meta(2, 3)} onPageChange={onPageChange} />);

    expect(screen.getByRole("navigation", { name: "Paginación" })).toHaveTextContent("Página 2 de 3 (25 facturas)");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it("deshabilita Anterior en la primera página", () => {
    render(<Pagination meta={meta(1, 3)} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });

  it("deshabilita Siguiente en la última página", () => {
    render(<Pagination meta={meta(3, 3)} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
  });
});

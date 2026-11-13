// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPageItems, Pagination } from "./Pagination";

afterEach(cleanup);

describe("buildPageItems", () => {
  it("muestra todas las páginas si son pocas", () => {
    expect(buildPageItems(1, 1)).toEqual([1]);
    expect(buildPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("al inicio agrupa el final con una elipsis", () => {
    expect(buildPageItems(1, 20)).toEqual([1, 2, 3, 4, "end-ellipsis", 20]);
    expect(buildPageItems(3, 20)).toEqual([1, 2, 3, 4, "end-ellipsis", 20]);
  });

  it("en el medio muestra las vecinas y elipsis a ambos lados", () => {
    expect(buildPageItems(10, 20)).toEqual([1, "start-ellipsis", 9, 10, 11, "end-ellipsis", 20]);
  });

  it("al final agrupa el inicio con una elipsis", () => {
    expect(buildPageItems(20, 20)).toEqual([1, "start-ellipsis", 17, 18, 19, 20]);
    expect(buildPageItems(18, 20)).toEqual([1, "start-ellipsis", 17, 18, 19, 20]);
  });
});

describe("Pagination (botones)", () => {
  it("no se muestra con una sola página", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("tiene primera, anterior, numeración, siguiente y última como botones con nombre", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);
    for (const name of [
      "Primera página",
      "Anterior",
      "Página 1",
      "Página 2",
      "Página 5",
      "Siguiente",
      "Última página",
    ]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Página 2" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByText("Página 2 de 5")).toBeTruthy();
  });

  it("llama a onPageChange con la página elegida", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} totalPages={10} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Primera página" }));
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Última página" }));
    fireEvent.click(screen.getByRole("button", { name: "Página 4" }));
    expect(onPageChange.mock.calls.map(([target]) => target)).toEqual([1, 2, 4, 10, 4]);
  });

  it("desactiva primera y anterior en la primera página, y siguiente y última en la última", () => {
    const { rerender } = render(<Pagination page={1} totalPages={4} onPageChange={vi.fn()} />);
    expect(
      (screen.getByRole("button", { name: "Primera página" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement).disabled).toBe(
      false,
    );

    rerender(<Pagination page={4} totalPages={4} onPageChange={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole("button", { name: "Última página" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("los controles solo tienen icono (sin texto visible)", () => {
    render(<Pagination page={2} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Siguiente" }).textContent).toBe("");
    expect(screen.getByRole("button", { name: "Siguiente" }).querySelector("svg")).not.toBeNull();
  });
});

describe("Pagination (enlaces)", () => {
  it("usa enlaces con la URL de cada página y sin enlace donde no hay destino", () => {
    render(<Pagination page={1} totalPages={3} buildHref={(target) => `/lista?page=${target}`} />);
    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toBe(
      "/lista?page=2",
    );
    expect(screen.getByRole("link", { name: "Última página" }).getAttribute("href")).toBe(
      "/lista?page=3",
    );
    expect(screen.queryByRole("link", { name: "Anterior" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Primera página" })).toBeNull();
    expect(screen.getByRole("link", { name: "Página 1" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });
});

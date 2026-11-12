// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdminPropertyFilters,
  countAdminFilters,
  emptyAdminFilters,
  toAdminQuery,
  validateAdminFilters,
} from "./AdminPropertyFilters";

afterEach(cleanup);

function renderFilters(filters = emptyAdminFilters) {
  const onChange = vi.fn();
  render(<AdminPropertyFilters id="filters" filters={filters} onChange={onChange} />);
  return onChange;
}

describe("AdminPropertyFilters", () => {
  it("ofrece operación, estado, tipo, rango de precio y fecha de publicación", () => {
    renderFilters();
    expect(
      within(screen.getByRole("group", { name: "Operación" })).getAllByRole("checkbox"),
    ).toHaveLength(2);
    expect(
      within(screen.getByRole("group", { name: "Estado de la propiedad" })).getAllByRole(
        "checkbox",
      ),
    ).toHaveLength(3);
    expect(
      within(screen.getByRole("group", { name: "Tipo de propiedad" })).getAllByRole("checkbox"),
    ).toHaveLength(6);
    expect(screen.getByLabelText("Mínimo")).toBeTruthy();
    expect(screen.getByLabelText("Máximo")).toBeTruthy();
    expect(screen.getByLabelText("Desde")).toBeTruthy();
    expect(screen.getByLabelText("Hasta")).toBeTruthy();
  });

  it("aplica las casillas al instante, acumulando selecciones", async () => {
    const onChange = renderFilters();
    fireEvent.click(screen.getByRole("checkbox", { name: "Vendida" }));
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ ...emptyAdminFilters, availability: ["SOLD"] }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Rentada" }));
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        ...emptyAdminFilters,
        availability: ["SOLD", "RENTED"],
      }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Vendida" }));
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ ...emptyAdminFilters, availability: ["RENTED"] }),
    );
  });

  it("aplica precio y fechas tras una pausa", async () => {
    const onChange = renderFilters();
    fireEvent.change(screen.getByLabelText("Mínimo"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-01-01" } });
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        ...emptyAdminFilters,
        minPrice: "1000",
        publishedFrom: "2026-01-01",
      }),
    );
  });

  it("no envía valores inválidos y muestra el error", async () => {
    const onChange = renderFilters();
    fireEvent.change(screen.getByLabelText("Mínimo"), { target: { value: "abc" } });
    expect(await screen.findByText("Ingresa un número válido")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Mínimo"), { target: { value: "900" } });
    fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "100" } });
    expect(await screen.findByText(/no puede superar/)).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("«Limpiar filtros» quita todo y está deshabilitado sin filtros", () => {
    const onChange = renderFilters({ ...emptyAdminFilters, operation: ["SALE"], minPrice: "5" });
    const clear = screen.getByRole("button", { name: "Limpiar filtros" }) as HTMLButtonElement;
    expect(clear.disabled).toBe(false);
    fireEvent.click(clear);
    expect(onChange).toHaveBeenCalledWith(emptyAdminFilters);
    expect((screen.getByLabelText("Mínimo") as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("checkbox", { name: "Venta" }) as HTMLInputElement).checked).toBe(
      false,
    );
    expect((clear as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("utilidades de filtros", () => {
  it("cuenta cada casilla y cada campo con valor", () => {
    expect(countAdminFilters(emptyAdminFilters)).toBe(0);
    expect(
      countAdminFilters({
        ...emptyAdminFilters,
        operation: ["SALE", "RENT"],
        availability: ["SOLD"],
        minPrice: "1",
        publishedTo: "2026-01-01",
      }),
    ).toBe(5);
  });

  it("valida rangos y formatos", () => {
    expect(validateAdminFilters(emptyAdminFilters)).toEqual({});
    expect(validateAdminFilters({ ...emptyAdminFilters, maxPrice: "x" }).maxPrice).toBeDefined();
    expect(
      validateAdminFilters({ ...emptyAdminFilters, minPrice: "9", maxPrice: "1" }).minPrice,
    ).toBeDefined();
    expect(
      validateAdminFilters({
        ...emptyAdminFilters,
        publishedFrom: "2026-05-01",
        publishedTo: "2026-04-01",
      }).publishedFrom,
    ).toBeDefined();
  });

  it("convierte los filtros a la consulta de la API omitiendo los vacíos", () => {
    expect(toAdminQuery(emptyAdminFilters)).toEqual({ operation: [], type: [], availability: [] });
    expect(
      toAdminQuery({ ...emptyAdminFilters, minPrice: "100", publishedFrom: "2026-01-01" }),
    ).toMatchObject({ minPrice: 100, publishedFrom: "2026-01-01" });
  });
});

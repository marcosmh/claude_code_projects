// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FiltersSidebar } from "./FiltersSidebar";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

afterEach(() => {
  cleanup();
  replace.mockReset();
});

const cities = ["Mérida", "Querétaro"];
const regions = ["Jalisco", "Yucatán"];

function renderSidebar(filters = {}) {
  return render(
    <FiltersSidebar id="filters" filters={filters} cities={cities} regions={regions} />,
  );
}

describe("FiltersSidebar", () => {
  it("usa casillas para operación y tipo, y listas para ciudad y región", () => {
    renderSidebar();
    const operation = within(screen.getByRole("group", { name: "Operación" }));
    expect(operation.getAllByRole("checkbox")).toHaveLength(2);
    const types = within(screen.getByRole("group", { name: "Tipo de propiedad" }));
    expect(types.getAllByRole("checkbox")).toHaveLength(6);
    expect(screen.getByLabelText("Ciudad").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Estado o región").tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Querétaro" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Yucatán" })).toBeTruthy();
  });

  it("permite elegir varias operaciones y varios tipos a la vez", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("checkbox", { name: "Venta" }));
    await user.click(screen.getByRole("checkbox", { name: "Arriendo" }));
    await user.click(screen.getByRole("checkbox", { name: "Casa" }));
    await user.click(screen.getByRole("checkbox", { name: "Departamento" }));

    // Se aplica solo, sin botón: la última URL tiene todas las selecciones.
    await waitFor(() =>
      expect(replace).toHaveBeenLastCalledWith(
        "/properties?operation=SALE%2CRENT&type=HOUSE%2CAPARTMENT",
        { scroll: false },
      ),
    );
  });

  it("precarga los filtros activos de la URL", () => {
    renderSidebar({
      operation: ["SALE", "RENT"],
      type: ["LAND"],
      city: "Mérida",
      bedrooms: 3,
      minPrice: 1000,
    });
    expect((screen.getByRole("checkbox", { name: "Venta" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect((screen.getByRole("checkbox", { name: "Arriendo" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect((screen.getByRole("checkbox", { name: "Terreno" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect((screen.getByRole("checkbox", { name: "Casa" }) as HTMLInputElement).checked).toBe(
      false,
    );
    expect((screen.getByLabelText("Ciudad") as HTMLSelectElement).value).toBe("Mérida");
    expect(
      (
        within(screen.getByRole("group", { name: "Dormitorios" })).getByRole("radio", {
          name: "3 o más",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect((screen.getByLabelText("Precio mínimo") as HTMLInputElement).value).toBe("1000");
  });

  it("combina selects, rangos y dormitorios, y conserva búsqueda y orden", async () => {
    const user = userEvent.setup();
    render(
      <FiltersSidebar
        id="filters"
        filters={{ search: "casa", sort: "price_asc" }}
        cities={cities}
        regions={regions}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Estado o región"), "Yucatán");
    await user.selectOptions(screen.getByLabelText("Ciudad"), "Mérida");
    await user.type(screen.getByLabelText("Precio máximo"), "5000000");
    await user.click(
      within(screen.getByRole("group", { name: "Dormitorios" })).getByRole("radio", {
        name: "2 o más",
      }),
    );

    await waitFor(() => {
      const lastUrl = replace.mock.calls.at(-1)?.[0] as string;
      expect(lastUrl).toContain("maxPrice=5000000");
      expect(lastUrl).toContain("bedrooms=2");
    });
    const url = new URL(replace.mock.calls.at(-1)?.[0] as string, "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: "casa",
      sort: "price_asc",
      region: "Yucatán",
      city: "Mérida",
      maxPrice: "5000000",
      bedrooms: "2",
    });
  });

  it("incluye el valor activo aunque no esté en las opciones", () => {
    renderSidebar({ city: "Puebla" });
    expect(screen.getByRole("option", { name: "Puebla" })).toBeTruthy();
    expect((screen.getByLabelText("Ciudad") as HTMLSelectElement).value).toBe("Puebla");
  });

  it("rechaza un rango de precio invertido o no numérico", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.type(screen.getByLabelText("Precio mínimo"), "900");
    await user.type(screen.getByLabelText("Precio máximo"), "100");
    expect(await screen.findByText(/no puede superar/)).toBeTruthy();

    await user.clear(screen.getByLabelText("Precio mínimo"));
    await user.type(screen.getByLabelText("Precio mínimo"), "abc");
    expect(await screen.findByText("Ingresa un número válido")).toBeTruthy();
    expect(replace).not.toHaveBeenCalledWith(
      expect.stringContaining("minPrice=abc"),
      expect.anything(),
    );
  });

  it("'Limpiar filtros' conserva solo la búsqueda", () => {
    renderSidebar({ search: "Mérida centro", operation: ["SALE"] });
    expect(screen.getByRole("link", { name: "Limpiar filtros" }).getAttribute("href")).toBe(
      "/properties?search=M%C3%A9rida%20centro",
    );
  });

  it("no tiene botón «Aplicar filtros»", () => {
    renderSidebar();
    expect(screen.queryByRole("button", { name: "Aplicar filtros" })).toBeNull();
  });

  it("filtra por estado de la propiedad con casillas", async () => {
    const user = userEvent.setup();
    renderSidebar();
    const states = within(screen.getByRole("group", { name: "Estado de la propiedad" }));
    expect(states.getAllByRole("checkbox")).toHaveLength(3);
    await user.click(states.getByRole("checkbox", { name: "Vendida" }));
    await user.click(states.getByRole("checkbox", { name: "Rentada" }));

    await waitFor(() =>
      expect(replace).toHaveBeenLastCalledWith("/properties?availability=SOLD%2CRENTED", {
        scroll: false,
      }),
    );
  });

  it("filtra por fecha de publicación y rechaza un rango invertido", async () => {
    const user = userEvent.setup();
    renderSidebar();
    const group = within(screen.getByRole("group", { name: "Fecha de publicación" }));
    await user.type(group.getByLabelText("Desde"), "2026-01-01");
    await user.type(group.getByLabelText("Hasta"), "2026-03-31");

    await waitFor(() =>
      expect(replace).toHaveBeenLastCalledWith(
        "/properties?publishedFrom=2026-01-01&publishedTo=2026-03-31",
        { scroll: false },
      ),
    );

    replace.mockReset();
    await user.clear(group.getByLabelText("Hasta"));
    await user.type(group.getByLabelText("Hasta"), "2025-12-31");
    expect(await screen.findByText(/fecha inicial no puede ser posterior/)).toBeTruthy();
    expect(replace).not.toHaveBeenCalledWith(
      expect.stringContaining("publishedTo=2025-12-31"),
      expect.anything(),
    );
  });

  it("precarga estado y fechas de la URL", () => {
    renderSidebar({ availability: ["SOLD"], publishedFrom: "2026-02-01" });
    expect((screen.getByRole("checkbox", { name: "Vendida" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2026-02-01");
  });
});

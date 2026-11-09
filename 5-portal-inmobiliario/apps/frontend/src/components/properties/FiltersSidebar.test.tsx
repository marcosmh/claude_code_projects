// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FiltersSidebar } from "./FiltersSidebar";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  push.mockReset();
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
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/properties?operation=SALE%2CRENT&type=HOUSE%2CAPARTMENT"),
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
          name: "3+",
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
      within(screen.getByRole("group", { name: "Dormitorios" })).getByRole("radio", { name: "2+" }),
    );
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    const url = new URL(push.mock.calls[0]?.[0] as string, "http://localhost");
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
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(await screen.findByText(/no puede superar/)).toBeTruthy();

    await user.clear(screen.getByLabelText("Precio mínimo"));
    await user.type(screen.getByLabelText("Precio mínimo"), "abc");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(await screen.findByText("Ingresa un número válido")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("'Limpiar filtros' conserva solo la búsqueda", () => {
    renderSidebar({ search: "Mérida centro", operation: ["SALE"] });
    expect(screen.getByRole("link", { name: "Limpiar filtros" }).getAttribute("href")).toBe(
      "/properties?search=M%C3%A9rida%20centro",
    );
  });
});

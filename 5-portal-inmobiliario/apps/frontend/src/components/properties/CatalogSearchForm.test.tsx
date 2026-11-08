// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogSearchForm } from "./CatalogSearchForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe("CatalogSearchForm", () => {
  it("refleja la búsqueda en la URL y vuelve a la primera página", async () => {
    render(<CatalogSearchForm filters={{}} />);
    await userEvent.setup().type(screen.getByLabelText("Buscar"), "  Mérida ");
    await userEvent.setup().click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/properties?search=M%C3%A9rida"));
  });

  it("precarga los valores actuales y conserva la operación", async () => {
    render(<CatalogSearchForm filters={{ search: "tulum", operation: "RENT" }} />);
    expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("tulum");
    await userEvent.setup().click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/properties?search=tulum&operation=RENT"),
    );
  });

  it("limpia la búsqueda al enviar vacío", async () => {
    render(<CatalogSearchForm filters={{ search: "tulum" }} />);
    await userEvent.setup().clear(screen.getByLabelText("Buscar"));
    await userEvent.setup().click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/properties"));
  });

  it("rechaza textos de más de 100 caracteres", async () => {
    render(<CatalogSearchForm filters={{ search: "a".repeat(101) }} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("combina filtros avanzados en la URL", async () => {
    const user = userEvent.setup();
    render(<CatalogSearchForm filters={{}} />);
    await user.selectOptions(screen.getByLabelText("Tipo de propiedad"), "HOUSE");
    await user.type(screen.getByLabelText("Precio mínimo"), "1000000");
    await user.type(screen.getByLabelText("Precio máximo"), "5000000");
    await user.selectOptions(screen.getByLabelText("Dormitorios"), "3");
    await user.selectOptions(screen.getByLabelText("Baños"), "2");
    await user.type(screen.getByLabelText(/Superficie útil mínima/), "100");
    await user.type(screen.getByLabelText("Ciudad"), "Querétaro");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/properties?type=HOUSE&minPrice=1000000&maxPrice=5000000&bedrooms=3&bathrooms=2&minUsableArea=100&city=Quer%C3%A9taro",
      ),
    );
  });

  it("precarga los filtros activos y abre el panel de filtros", () => {
    render(<CatalogSearchForm filters={{ type: "LAND", bedrooms: 2, region: "Jalisco" }} />);
    expect((screen.getByLabelText("Tipo de propiedad") as HTMLSelectElement).value).toBe("LAND");
    expect((screen.getByLabelText("Dormitorios") as HTMLSelectElement).value).toBe("2");
    expect((screen.getByLabelText("Estado o región") as HTMLInputElement).value).toBe("Jalisco");
    expect(document.querySelector("details")?.hasAttribute("open")).toBe(true);
  });

  it("rechaza precios inválidos o rango invertido", async () => {
    const user = userEvent.setup();
    render(<CatalogSearchForm filters={{}} />);
    await user.type(screen.getByLabelText("Precio mínimo"), "900");
    await user.type(screen.getByLabelText("Precio máximo"), "100");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText(/no puede superar/)).toBeTruthy();
    await user.clear(screen.getByLabelText("Precio máximo"));
    await user.clear(screen.getByLabelText("Precio mínimo"));
    await user.type(screen.getByLabelText("Precio mínimo"), "abc");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("Ingresa un número válido")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});

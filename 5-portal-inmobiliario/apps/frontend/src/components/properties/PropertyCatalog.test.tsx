// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PropertySummaryDto } from "@portal/shared-types";
import { PropertyCatalog } from "./PropertyCatalog";

const usePropertyListMock = vi.fn();
const pushMock = vi.hoisted(() => vi.fn());
let currentQuery = "";
vi.mock("@/hooks/usePropertyList", () => ({
  usePropertyList: (params: unknown) => usePropertyListMock(params),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(currentQuery),
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/hooks/usePropertyLocations", () => ({
  usePropertyLocations: () => ({ cities: ["Mérida", "Querétaro"], regions: ["Yucatán"] }),
}));
const isDesktopMock = vi.hoisted(() => ({ value: true }));
vi.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: () => isDesktopMock.value }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(() => {
  cleanup();
  usePropertyListMock.mockReset();
  pushMock.mockReset();
  currentQuery = "";
  isDesktopMock.value = true;
});

const property: PropertySummaryDto = {
  id: "p1",
  title: "Casa en Coyoacán",
  operation: "SALE",
  type: "HOUSE",
  price: 5000000,
  currency: "MXN",
  usableArea: 120,
  bedrooms: 3,
  bathrooms: 2,
  commune: "Coyoacán",
  city: "Ciudad de México",
  region: "Ciudad de México",
  isFeatured: false,
  primaryImageUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockList(overrides: Record<string, unknown>) {
  usePropertyListMock.mockReturnValue({
    properties: [],
    total: 0,
    totalPages: 0,
    isLoading: false,
    hasError: false,
    retry: vi.fn(),
    ...overrides,
  });
}

describe("PropertyCatalog", () => {
  it("consulta la API con página y operación de la URL", () => {
    currentQuery = "operation=RENT&page=2";
    mockList({ isLoading: true });
    render(<PropertyCatalog />);
    expect(usePropertyListMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 12,
      operation: ["RENT"],
    });
    expect(screen.getByRole("heading", { level: 1, name: "Propiedades en arriendo" })).toBeTruthy();
  });

  it("envía la búsqueda de la URL a la API y la conserva en la paginación", () => {
    currentQuery = "search=providencia&operation=SALE";
    mockList({ properties: [property], total: 25, totalPages: 3 });
    render(<PropertyCatalog />);
    expect(usePropertyListMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 12,
      search: "providencia",
      operation: ["SALE"],
    });
    expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("providencia");
    expect(screen.getByRole("link", { name: /Siguiente/ }).getAttribute("href")).toBe(
      "/properties?search=providencia&operation=SALE&page=2",
    );
  });

  it("indica cuando la búsqueda no tiene resultados", () => {
    currentQuery = "search=zzz";
    mockList({});
    render(<PropertyCatalog />);
    expect(screen.getByText(/No encontramos propiedades para “zzz”/)).toBeTruthy();
  });

  it("envía todos los filtros de la URL a la API y los conserva en la paginación", () => {
    currentQuery = "type=HOUSE&minPrice=100&bedrooms=3&city=Mérida";
    mockList({ properties: [property], total: 25, totalPages: 3 });
    render(<PropertyCatalog />);
    expect(usePropertyListMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 12,
      type: ["HOUSE"],
      minPrice: 100,
      bedrooms: 3,
      city: "Mérida",
    });
    expect(screen.getByRole("link", { name: /Siguiente/ }).getAttribute("href")).toBe(
      "/properties?type=HOUSE&minPrice=100&bedrooms=3&city=M%C3%A9rida&page=2",
    );
  });

  it("envía el orden a la API y permite cambiarlo conservando los filtros", async () => {
    currentQuery = "operation=SALE&sort=price_asc";
    mockList({ properties: [property], total: 1, totalPages: 1 });
    render(<PropertyCatalog />);
    expect(usePropertyListMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 12,
      operation: ["SALE"],
      sort: "price_asc",
    });
    const select = screen.getByLabelText("Ordenar por") as HTMLSelectElement;
    expect(select.value).toBe("price_asc");
    await userEvent.setup().selectOptions(select, "area_desc");
    expect(pushMock).toHaveBeenCalledWith("/properties?operation=SALE&sort=area_desc");
  });

  it("muestra estado de carga", () => {
    mockList({ isLoading: true });
    render(<PropertyCatalog />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("muestra error con reintento", async () => {
    const retry = vi.fn();
    mockList({ hasError: true, retry });
    render(<PropertyCatalog />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("muestra estado vacío", () => {
    mockList({});
    render(<PropertyCatalog />);
    expect(screen.getByText(/no hay propiedades publicadas/i)).toBeTruthy();
  });

  it("muestra tarjetas, total y paginación que conserva la operación", () => {
    currentQuery = "operation=SALE";
    mockList({ properties: [property], total: 25, totalPages: 3 });
    render(<PropertyCatalog />);
    expect(screen.getByRole("heading", { level: 3, name: "Casa en Coyoacán" })).toBeTruthy();
    expect(screen.getByText("25 propiedades disponibles")).toBeTruthy();
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Anterior/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Siguiente/ }).getAttribute("href")).toBe(
      "/properties?operation=SALE&page=2",
    );
  });

  it("muestra el sidebar de filtros abierto en escritorio y permite colapsarlo", async () => {
    mockList({ properties: [property], total: 1, totalPages: 1 });
    render(<PropertyCatalog />);
    const toggle = screen.getByRole("button", { name: /Ocultar filtros/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("form", { name: "Filtros de propiedades" })).toBeTruthy();

    await userEvent.setup().click(toggle);
    const reopen = screen.getByRole("button", { name: /Mostrar filtros/ });
    expect(reopen.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("form", { name: "Filtros de propiedades" })).toBeNull();
  });

  it("empieza con el sidebar cerrado en móvil", () => {
    isDesktopMock.value = false;
    mockList({ properties: [property], total: 1, totalPages: 1 });
    render(<PropertyCatalog />);
    expect(screen.getByRole("button", { name: /Mostrar filtros/ })).toBeTruthy();
  });

  it("indica cuántos filtros hay activos y usa el título genérico con varias operaciones", () => {
    currentQuery = "operation=SALE,RENT&type=HOUSE,LAND&city=Mérida&search=casa&sort=price_asc";
    mockList({ properties: [property], total: 1, totalPages: 1 });
    render(<PropertyCatalog />);
    expect(screen.getByRole("heading", { level: 1, name: "Propiedades" })).toBeTruthy();
    // 2 operaciones + 2 tipos + 1 ciudad; la búsqueda y el orden no cuentan.
    expect(screen.getByText(/^5/, { selector: "span" })).toBeTruthy();
    expect(usePropertyListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: ["SALE", "RENT"],
        type: ["HOUSE", "LAND"],
        city: "Mérida",
      }),
    );
  });

  it("muestra un mensaje específico cuando los filtros no tienen resultados", () => {
    currentQuery = "type=LAND";
    mockList({});
    render(<PropertyCatalog />);
    expect(screen.getByText("No hay propiedades que coincidan con los filtros.")).toBeTruthy();
  });
});

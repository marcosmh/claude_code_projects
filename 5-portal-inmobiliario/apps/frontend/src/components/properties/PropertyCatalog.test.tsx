// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PropertySummaryDto } from "@portal/shared-types";
import { PropertyCatalog } from "./PropertyCatalog";

const usePropertyListMock = vi.fn();
let currentQuery = "";
vi.mock("@/hooks/usePropertyList", () => ({
  usePropertyList: (params: unknown) => usePropertyListMock(params),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(currentQuery),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(() => {
  cleanup();
  usePropertyListMock.mockReset();
  currentQuery = "";
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
    expect(usePropertyListMock).toHaveBeenCalledWith({ page: 2, pageSize: 12, operation: "RENT" });
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
      operation: "SALE",
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
});

// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PropertyDetailDto } from "@portal/shared-types";
import { PropertyDetail } from "./PropertyDetail";

const usePropertyDetailMock = vi.fn();
vi.mock("@/hooks/usePropertyDetail", () => ({
  usePropertyDetail: (propertyId: string) => usePropertyDetailMock(propertyId),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(() => {
  cleanup();
  usePropertyDetailMock.mockReset();
});

const property: PropertyDetailDto = {
  id: "p1",
  title: "Casa en Coyoacán",
  description: "Casa amplia\ncon jardín.",
  operation: "SALE",
  type: "HOUSE",
  price: 5000000,
  currency: "MXN",
  usableArea: 120,
  totalArea: 200,
  bedrooms: 3,
  bathrooms: 2,
  parkingSpots: 1,
  age: 0,
  address: "Calle Hidalgo 10",
  commune: "Coyoacán",
  city: "Ciudad de México",
  region: "Ciudad de México",
  isFeatured: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  images: [
    { id: "i2", url: "https://example.com/b.jpg", position: 1, isPrimary: false },
    { id: "i1", url: "https://example.com/a.jpg", position: 0, isPrimary: true },
  ],
  features: [{ id: "f1", name: "Jardín", slug: "jardin" }],
};

function mockDetail(overrides: Record<string, unknown>) {
  usePropertyDetailMock.mockReturnValue({
    property: undefined,
    isLoading: false,
    isNotFound: false,
    hasError: false,
    retry: vi.fn(),
    ...overrides,
  });
}

describe("PropertyDetail", () => {
  it("consulta la propiedad por su id", () => {
    mockDetail({ isLoading: true });
    render(<PropertyDetail propertyId="p1" />);
    expect(usePropertyDetailMock).toHaveBeenCalledWith("p1");
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("muestra la información completa", () => {
    mockDetail({ property });
    render(<PropertyDetail propertyId="p1" />);
    expect(screen.getByRole("heading", { level: 1, name: "Casa en Coyoacán" })).toBeTruthy();
    expect(screen.getByText(/Calle Hidalgo 10, Coyoacán, Ciudad de México/)).toBeTruthy();
    expect(screen.getByText("Venta")).toBeTruthy();
    expect(screen.getByText("$5,000,000")).toBeTruthy();
    expect(screen.getByText(/Casa amplia/)).toBeTruthy();
    expect(screen.getByText("Jardín")).toBeTruthy();
    const summary = within(screen.getByRole("complementary", { name: "Resumen de la propiedad" }));
    expect(summary.getByText("Casa")).toBeTruthy();
    expect(summary.getByText("120 m²")).toBeTruthy();
    expect(summary.getByText("200 m²")).toBeTruthy();
    expect(summary.getByText("Dormitorios").nextSibling?.textContent).toBe("3");
    expect(summary.getByText("Baños").nextSibling?.textContent).toBe("2");
    expect(summary.getByText("Estacionamientos").nextSibling?.textContent).toBe("1");
    expect(summary.getByText("A estrenar")).toBeTruthy();
  });

  it("muestra la galería con la imagen principal primero", () => {
    mockDetail({ property });
    render(<PropertyDetail propertyId="p1" />);
    expect(screen.getByRole("region", { name: "Galería de Casa en Coyoacán" })).toBeTruthy();
    expect(screen.getByAltText("Fotografía 1 de 2 de Casa en Coyoacán").getAttribute("src")).toBe(
      "https://example.com/a.jpg",
    );
  });

  it("omite los datos que no existen", () => {
    mockDetail({
      property: {
        ...property,
        usableArea: null,
        totalArea: null,
        bedrooms: null,
        bathrooms: null,
        parkingSpots: null,
        age: null,
        features: [],
        images: [],
      },
    });
    render(<PropertyDetail propertyId="p1" />);
    expect(screen.queryByText("Superficie útil")).toBeNull();
    expect(screen.queryByText("Antigüedad")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Características" })).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("muestra un mensaje cuando la propiedad no existe", () => {
    mockDetail({ isNotFound: true });
    render(<PropertyDetail propertyId="x" />);
    expect(screen.getByRole("heading", { name: "Propiedad no encontrada" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Volver a propiedades/ }).getAttribute("href")).toBe(
      "/properties",
    );
  });

  it("muestra error con reintento", async () => {
    const retry = vi.fn();
    mockDetail({ hasError: true, retry });
    render(<PropertyDetail propertyId="p1" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PropertySummaryDto } from "@portal/shared-types";
import { PropertySection } from "./PropertySection";

const usePropertyListMock = vi.fn();
vi.mock("@/hooks/usePropertyList", () => ({
  usePropertyList: (params: unknown) => usePropertyListMock(params),
}));
vi.mock("@/components/favorites/FavoriteButton", () => ({
  FavoriteButton: ({ propertyId }: { propertyId: string }) => (
    <button type="button" data-testid="favorite-button">{`fav-${propertyId}`}</button>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(() => {
  cleanup();
  usePropertyListMock.mockReset();
});

const sampleProperty: PropertySummaryDto = {
  id: "p1",
  title: "Departamento en Polanco",
  operation: "RENT",
  type: "APARTMENT",
  price: 24500,
  currency: "MXN",
  availability: "AVAILABLE",
  usableArea: 68,
  bedrooms: 2,
  bathrooms: 1,
  commune: "Polanco",
  city: "Ciudad de México",
  region: "Ciudad de México",
  isFeatured: true,
  primaryImageUrl: "https://picsum.photos/seed/x/1200/800",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderSection() {
  return render(
    <PropertySection
      id="rent"
      title="Propiedades en arriendo"
      description="Descripción"
      params={{ operation: "RENT", pageSize: 3 }}
      viewAllHref="/properties?operation=RENT"
      viewAllLabel="Ver todas en arriendo"
    />,
  );
}

describe("PropertySection", () => {
  it("pide las propiedades con los parámetros recibidos", () => {
    usePropertyListMock.mockReturnValue({
      properties: [],
      isLoading: true,
      hasError: false,
      retry: vi.fn(),
    });
    renderSection();
    expect(usePropertyListMock).toHaveBeenCalledWith({ operation: "RENT", pageSize: 3 });
  });

  it("muestra skeletons mientras carga", () => {
    usePropertyListMock.mockReturnValue({
      properties: [],
      isLoading: true,
      hasError: false,
      retry: vi.fn(),
    });
    renderSection();
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("muestra error con botón de reintento", async () => {
    const retry = vi.fn();
    usePropertyListMock.mockReturnValue({
      properties: [],
      isLoading: false,
      hasError: true,
      retry,
    });
    renderSection();
    expect(screen.getByRole("alert")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("muestra estado vacío", () => {
    usePropertyListMock.mockReturnValue({
      properties: [],
      isLoading: false,
      hasError: false,
      retry: vi.fn(),
    });
    renderSection();
    expect(screen.getByText(/no hay propiedades/i)).toBeTruthy();
  });

  it("muestra las tarjetas con precio, ubicación, enlace al detalle y alt en la imagen", () => {
    usePropertyListMock.mockReturnValue({
      properties: [sampleProperty],
      isLoading: false,
      hasError: false,
      retry: vi.fn(),
    });
    renderSection();

    expect(screen.getByRole("heading", { level: 2, name: "Propiedades en arriendo" })).toBeTruthy();
    expect(screen.getByText("$24,500 / mes")).toBeTruthy();
    expect(screen.getByText("Polanco, Ciudad de México")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Departamento en Polanco/ }).getAttribute("href")).toBe(
      "/properties/p1",
    );
    expect(screen.getByAltText("Fotografía de Departamento en Polanco")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ver todas en arriendo/ }).getAttribute("href")).toBe(
      "/properties?operation=RENT",
    );
  });
});

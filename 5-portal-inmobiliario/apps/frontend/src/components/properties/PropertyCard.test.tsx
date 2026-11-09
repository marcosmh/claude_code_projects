// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PropertySummaryDto } from "@portal/shared-types";
import { PropertyCard } from "./PropertyCard";
import { PropertyGrid } from "./PropertyGrid";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(cleanup);

const property: PropertySummaryDto = {
  id: "p1",
  title: "Departamento en Polanco",
  operation: "RENT",
  type: "APARTMENT",
  price: 24500,
  currency: "MXN",
  usableArea: 68,
  bedrooms: 2,
  bathrooms: 1,
  commune: "Polanco",
  city: "Ciudad de México",
  region: "Ciudad de México",
  isFeatured: false,
  primaryImageUrl: "https://picsum.photos/seed/x/1200/800",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("PropertyCard", () => {
  it("muestra imagen, título, precio, operación, tipo, ubicación y características", () => {
    render(<PropertyCard property={property} />);
    expect(screen.getByRole("img", { name: /Departamento en Polanco/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Departamento en Polanco" })).toBeTruthy();
    expect(screen.getByText(/24,500/)).toBeTruthy();
    expect(screen.getByText("Arriendo")).toBeTruthy();
    expect(screen.getByText("Departamento")).toBeTruthy();
    expect(screen.getByText("Polanco, Ciudad de México")).toBeTruthy();
    const features = within(screen.getByRole("list", { name: "Características" }));
    expect(features.getByText("2 dorms.")).toBeTruthy();
    expect(features.getByText("1 baño")).toBeTruthy();
    expect(features.getByText("68 m²")).toBeTruthy();
  });

  it("enlaza al detalle de la propiedad", () => {
    render(<PropertyCard property={property} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/properties/p1");
  });

  it("omite características y imagen cuando no existen", () => {
    render(
      <PropertyCard
        property={{
          ...property,
          bedrooms: null,
          bathrooms: null,
          usableArea: null,
          primaryImageUrl: null,
        }}
      />,
    );
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("usa singular para un dormitorio", () => {
    render(<PropertyCard property={{ ...property, bedrooms: 1 }} />);
    expect(screen.getByText("1 dorm.")).toBeTruthy();
  });
});

describe("PropertyCard accesibilidad y tipografía", () => {
  it("usa h3 por defecto y permite h2 para respetar la jerarquía", () => {
    const { rerender } = render(<PropertyCard property={property} />);
    expect(screen.getByRole("heading", { level: 3, name: property.title })).toBeTruthy();
    rerender(<PropertyCard property={property} headingLevel="h2" />);
    expect(screen.getByRole("heading", { level: 2, name: property.title })).toBeTruthy();
  });

  it("muestra el precio con cifras tabulares", () => {
    render(<PropertyCard property={property} />);
    expect(screen.getByText(/24,500/).className).toContain("tabular-nums");
  });

  it("evita saltos de línea entre cifra y unidad", () => {
    render(<PropertyCard property={property} />);
    // Testing Library normaliza los espacios, así que se comprueba el texto crudo.
    const features = screen.getByRole("list", { name: "Características" }).textContent ?? "";
    expect(features).toContain("68\u00a0m²");
    expect(features).toContain("1\u00a0baño");
  });
});

describe("PropertyGrid", () => {
  it("define columnas responsive", () => {
    const { container } = render(
      <PropertyGrid>
        <PropertyCard property={property} />
      </PropertyGrid>,
    );
    const className = (container.firstElementChild as HTMLElement).className;
    expect(className).toContain("sm:grid-cols-2");
    expect(className).toContain("lg:grid-cols-3");
  });
});

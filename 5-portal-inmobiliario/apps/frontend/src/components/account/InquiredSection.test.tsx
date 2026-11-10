// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PropertySummaryDto } from "@portal/shared-types";

const state = vi.hoisted(() => ({ properties: undefined as PropertySummaryDto[] | undefined }));
vi.mock("@/hooks/useInquiredProperties", () => ({
  useInquiredProperties: () => ({ properties: state.properties, refresh: vi.fn() }),
}));
vi.mock("@/components/properties/PropertyCard", () => ({
  PropertyCard: ({ property }: { property: PropertySummaryDto }) => <p>{property.title}</p>,
}));

import { InquiredSection } from "./InquiredSection";

afterEach(() => {
  cleanup();
  state.properties = undefined;
});

const summary = (id: string, title: string) => ({ id, title }) as PropertySummaryDto;

describe("InquiredSection", () => {
  it("indica que carga mientras no hay datos", () => {
    render(<InquiredSection />);
    expect(screen.getByRole("heading", { level: 2, name: "Propiedades consultadas" })).toBeTruthy();
    expect(screen.getByText("Cargando tus consultas…")).toBeTruthy();
  });

  it("muestra el estado vacío con un enlace al catálogo", () => {
    state.properties = [];
    render(<InquiredSection />);
    expect(screen.getByText("Aún no has consultado ninguna propiedad.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar propiedades" }).getAttribute("href")).toBe(
      "/properties",
    );
  });

  it("lista las propiedades consultadas", () => {
    state.properties = [summary("p1", "Casa en Coyoacán"), summary("p2", "Depto en Polanco")];
    render(<InquiredSection />);
    expect(screen.getByText("Casa en Coyoacán")).toBeTruthy();
    expect(screen.getByText("Depto en Polanco")).toBeTruthy();
  });
});

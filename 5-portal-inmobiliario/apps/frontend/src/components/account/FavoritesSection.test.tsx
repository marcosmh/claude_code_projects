// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PropertySummaryDto } from "@portal/shared-types";

const state = vi.hoisted(() => ({ favorites: undefined as PropertySummaryDto[] | undefined }));
vi.mock("@/hooks/useFavorites", () => ({ useFavorites: () => ({ favorites: state.favorites }) }));
vi.mock("@/components/properties/PropertyCard", () => ({
  PropertyCard: ({ property }: { property: PropertySummaryDto }) => <p>{property.title}</p>,
}));

import { FavoritesSection } from "./FavoritesSection";

afterEach(() => {
  cleanup();
  state.favorites = undefined;
});

const summary = (id: string, title: string) => ({ id, title }) as PropertySummaryDto;

describe("FavoritesSection", () => {
  it("indica que carga mientras no hay datos", () => {
    render(<FavoritesSection />);
    expect(screen.getByRole("heading", { level: 2, name: "Propiedades interesadas" })).toBeTruthy();
    expect(screen.getByText("Cargando tus favoritos…")).toBeTruthy();
  });

  it("muestra el estado vacío con un enlace al catálogo", () => {
    state.favorites = [];
    render(<FavoritesSection />);
    expect(screen.getByText("Aún no tienes propiedades guardadas.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar propiedades" }).getAttribute("href")).toBe(
      "/properties",
    );
  });

  it("lista las propiedades guardadas", () => {
    state.favorites = [summary("p1", "Casa en Coyoacán"), summary("p2", "Depto en Polanco")];
    render(<FavoritesSection />);
    expect(screen.getByText("Casa en Coyoacán")).toBeTruthy();
    expect(screen.getByText("Depto en Polanco")).toBeTruthy();
    expect(screen.queryByText("Aún no tienes propiedades guardadas.")).toBeNull();
  });
});

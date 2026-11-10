// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: null, isLoading: false, setUser: vi.fn() }),
}));
vi.mock("@/hooks/useFavorites", () => ({ useFavorites: () => ({ favorites: undefined }) }));
vi.mock("@portal/api-client", () => ({ logoutUser: vi.fn() }));

import { Header } from "./Header";

afterEach(() => {
  cleanup();
  pathname.current = "/";
});

describe("Header", () => {
  it("muestra el botón Ingresar que lleva a /login, en escritorio y en el menú móvil", () => {
    render(<Header />);
    // El menú móvil está oculto (atributo hidden) hasta que se abre; hidden:true lo incluye.
    const loginLinks = screen.getAllByRole("link", { name: "Ingresar", hidden: true });

    expect(loginLinks).toHaveLength(2);
    for (const link of loginLinks) {
      expect(link.getAttribute("href")).toBe("/login");
    }
  });

  it("no repite Ingresar dentro de los enlaces del menú principal", () => {
    render(<Header />);
    const mainNavigation = screen.getByRole("navigation", { name: "Navegación principal" });

    expect(within(mainNavigation).queryByRole("link", { name: "Ingresar" })).toBeNull();
    expect(
      within(mainNavigation)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Inicio", "Propiedades", "Comprar", "Arrendar"]);
  });

  it("marca el botón como página actual en /login", () => {
    pathname.current = "/login";
    render(<Header />);
    for (const link of screen.getAllByRole("link", { name: "Ingresar", hidden: true })) {
      expect(link.getAttribute("aria-current")).toBe("page");
    }
  });

  it("no marca el botón como actual en otras páginas", () => {
    render(<Header />);
    for (const link of screen.getAllByRole("link", { name: "Ingresar", hidden: true })) {
      expect(link.getAttribute("aria-current")).toBeNull();
    }
  });
});

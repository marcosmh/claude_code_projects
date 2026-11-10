// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
const navigation = vi.hoisted(() => ({ pathname: "/properties/p1" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => navigation.pathname,
}));

const favorites = vi.hoisted(() => ({
  isSignedIn: true,
  saved: new Set<string>(),
  toggleFavorite: vi.fn(),
}));
vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({
    isSignedIn: favorites.isSignedIn,
    isFavorite: (propertyId: string) => favorites.saved.has(propertyId),
    toggleFavorite: favorites.toggleFavorite,
  }),
}));

import { FavoriteButton } from "./FavoriteButton";

afterEach(() => {
  cleanup();
  push.mockReset();
  favorites.isSignedIn = true;
  favorites.saved = new Set();
  favorites.toggleFavorite.mockReset();
  navigation.pathname = "/properties/p1";
});

describe("FavoriteButton", () => {
  it("se ofrece a guardar y no está presionado cuando no es favorita", () => {
    render(<FavoriteButton propertyId="p1" propertyTitle="Casa en Coyoacán" />);
    const button = screen.getByRole("button", { name: "Guardar en favoritos: Casa en Coyoacán" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("se ofrece a quitar y está presionado cuando ya es favorita", () => {
    favorites.saved = new Set(["p1"]);
    render(<FavoriteButton propertyId="p1" propertyTitle="Casa en Coyoacán" />);
    const button = screen.getByRole("button", { name: "Quitar de favoritos: Casa en Coyoacán" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("con sesión alterna la favorita al pulsar", async () => {
    favorites.toggleFavorite.mockResolvedValue(undefined);
    render(<FavoriteButton propertyId="p1" propertyTitle="Casa" />);

    await userEvent.setup().click(screen.getByRole("button"));

    await waitFor(() => expect(favorites.toggleFavorite).toHaveBeenCalledWith("p1"));
    expect(push).not.toHaveBeenCalled();
  });

  it("sin sesión lleva a iniciar sesión y vuelve a la página actual", async () => {
    favorites.isSignedIn = false;
    navigation.pathname = "/properties/p1";
    render(<FavoriteButton propertyId="p1" propertyTitle="Casa" />);

    await userEvent.setup().click(screen.getByRole("button"));

    expect(push).toHaveBeenCalledWith("/login?next=%2Fproperties%2Fp1");
    expect(favorites.toggleFavorite).not.toHaveBeenCalled();
  });

  it("avisa si falla la API y vuelve a habilitar el botón", async () => {
    favorites.toggleFavorite.mockRejectedValue(new Error("red"));
    render(<FavoriteButton propertyId="p1" propertyTitle="Casa" />);

    await userEvent.setup().click(screen.getByRole("button"));

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos actualizar");
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false);
  });
});

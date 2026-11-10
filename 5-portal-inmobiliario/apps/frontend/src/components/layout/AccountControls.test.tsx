// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

const session = vi.hoisted(() => ({
  user: null as { id: string; name: string } | null | undefined,
  isLoading: false,
  setUser: vi.fn(),
}));
vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => session }));

const favoritesState = vi.hoisted(() => ({ favorites: undefined as { id: string }[] | undefined }));
vi.mock("@/hooks/useFavorites", () => ({ useFavorites: () => favoritesState }));

const logoutUserMock = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", () => ({ logoutUser: logoutUserMock }));

import { AccountControls } from "./AccountControls";

afterEach(() => {
  cleanup();
  navigation.pathname = "/";
  navigation.push.mockReset();
  session.user = null;
  session.isLoading = false;
  session.setUser.mockReset();
  favoritesState.favorites = undefined;
  logoutUserMock.mockReset();
});

describe("AccountControls sin sesión", () => {
  it("muestra el botón Ingresar hacia /login", () => {
    render(<AccountControls variant="desktop" />);
    const link = screen.getByRole("link", { name: "Ingresar" });
    expect(link.getAttribute("href")).toBe("/login");
    expect(link.getAttribute("aria-current")).toBeNull();
  });

  it("marca el botón como página actual en /login", () => {
    navigation.pathname = "/login";
    render(<AccountControls variant="desktop" />);
    expect(screen.getByRole("link", { name: "Ingresar" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("avisa al padre al navegar (cierra el menú móvil)", async () => {
    const onNavigate = vi.fn();
    // jsdom no implementa la navegación entre documentos: se cancela el clic del enlace.
    render(
      <div onClickCapture={(event) => event.preventDefault()}>
        <AccountControls variant="mobile" onNavigate={onNavigate} />
      </div>,
    );
    await userEvent.setup().click(screen.getByRole("link", { name: "Ingresar" }));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("no muestra ni Ingresar ni Cerrar sesión mientras consulta la sesión", () => {
    session.user = undefined;
    session.isLoading = true;
    render(<AccountControls variant="desktop" />);
    expect(screen.queryByRole("link", { name: "Ingresar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });
});

describe("AccountControls con sesión", () => {
  it("muestra el nombre y Cerrar sesión en lugar de Ingresar", () => {
    session.user = { id: "u1", name: "Ana Pérez" };
    render(<AccountControls variant="desktop" />);

    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ana Pérez/ }).getAttribute("href")).toBe("/account");
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Ingresar" })).toBeNull();
  });

  it("cierra la sesión, limpia el usuario y vuelve al inicio", async () => {
    session.user = { id: "u1", name: "Ana Pérez" };
    logoutUserMock.mockResolvedValue(undefined);
    const onNavigate = vi.fn();
    render(<AccountControls variant="mobile" onNavigate={onNavigate} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/"));
    expect(logoutUserMock).toHaveBeenCalledOnce();
    expect(session.setUser).toHaveBeenCalledWith(null);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("mantiene la sesión si falla el cierre", async () => {
    session.user = { id: "u1", name: "Ana Pérez" };
    logoutUserMock.mockRejectedValue(new Error("red"));
    render(<AccountControls variant="desktop" />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(logoutUserMock).toHaveBeenCalledOnce());
    expect(session.setUser).not.toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  });
});

describe("AccountControls contador de favoritas", () => {
  it("muestra la cantidad de favoritas con un enlace a /account", () => {
    session.user = { id: "u1", name: "Ana Pérez" };
    favoritesState.favorites = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
    render(<AccountControls variant="desktop" />);

    const link = screen.getByRole("link", { name: "Mis favoritas: 3" });
    expect(link.getAttribute("href")).toBe("/account");
    expect(link.textContent).toBe("3");
  });

  it("muestra 0 cuando no hay favoritas", () => {
    session.user = { id: "u1", name: "Ana Pérez" };
    favoritesState.favorites = [];
    render(<AccountControls variant="mobile" />);
    expect(screen.getByRole("link", { name: "Mis favoritas: 0" })).toBeTruthy();
  });

  it("no lo muestra mientras carga la lista ni a los visitantes", () => {
    session.user = { id: "u1", name: "Ana Pérez" };
    favoritesState.favorites = undefined;
    const { unmount } = render(<AccountControls variant="desktop" />);
    expect(screen.queryByRole("link", { name: /Mis favoritas/ })).toBeNull();
    unmount();

    session.user = null;
    favoritesState.favorites = [{ id: "p1" }];
    render(<AccountControls variant="desktop" />);
    expect(screen.queryByRole("link", { name: /Mis favoritas/ })).toBeNull();
  });
});

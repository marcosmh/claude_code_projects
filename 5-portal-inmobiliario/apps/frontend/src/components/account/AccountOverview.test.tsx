// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  user: undefined as
    { id: string; name: string; email: string; role: "USER" | "ADMIN" } | null | undefined,
  isLoading: false,
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: session.user, isLoading: session.isLoading, setUser: vi.fn() }),
}));

vi.mock("./FavoritesSection", () => ({
  FavoritesSection: () => (
    <section aria-label="Favoritos simulados">
      <h2>Propiedades interesadas</h2>
    </section>
  ),
}));

import { AccountOverview } from "./AccountOverview";

afterEach(() => {
  cleanup();
  session.user = undefined;
  session.isLoading = false;
});

describe("AccountOverview", () => {
  it("muestra la información básica y las dos secciones", () => {
    session.user = { id: "u1", name: "Ana Pérez", email: "ana@portal.mx", role: "USER" };
    render(<AccountOverview />);

    expect(screen.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeTruthy();
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.getByText("ana@portal.mx")).toBeTruthy();
    expect(screen.getByText("Usuario")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Editar datos" }).getAttribute("href")).toBe(
      "/account/edit",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Propiedades interesadas" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Propiedades consultadas" })).toBeTruthy();
  });

  it("traduce el rol ADMIN", () => {
    session.user = { id: "a1", name: "Admin", email: "admin@portal.mx", role: "ADMIN" };
    render(<AccountOverview />);
    expect(screen.getByText("Administrador")).toBeTruthy();
  });

  it("indica que se está cargando mientras consulta la sesión", () => {
    session.isLoading = true;
    render(<AccountOverview />);
    expect(screen.getByText("Cargando tu cuenta…")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Mi cuenta" })).toBeNull();
  });

  it("invita a iniciar sesión si la sesión terminó", () => {
    session.user = null;
    render(<AccountOverview />);
    expect(screen.getByRole("link", { name: "Inicia sesión de nuevo" }).getAttribute("href")).toBe(
      "/login?next=%2Faccount",
    );
  });
});

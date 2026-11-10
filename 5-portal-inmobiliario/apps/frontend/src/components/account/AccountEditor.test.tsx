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
vi.mock("./ProfileForm", () => ({
  ProfileForm: ({ user }: { user: { name: string } }) => (
    <form aria-label="Edición simulada">{user.name}</form>
  ),
}));

import { AccountEditor } from "./AccountEditor";

afterEach(() => {
  cleanup();
  session.user = undefined;
  session.isLoading = false;
});

describe("AccountEditor", () => {
  it("muestra el título, el enlace de regreso y el formulario con el usuario", () => {
    session.user = { id: "u1", name: "Ana Pérez", email: "ana@portal.mx", role: "USER" };
    render(<AccountEditor />);

    expect(screen.getByRole("heading", { level: 1, name: "Editar mi cuenta" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Volver a mi cuenta/ }).getAttribute("href")).toBe(
      "/account",
    );
    expect(screen.getByRole("form", { name: "Edición simulada" }).textContent).toBe("Ana Pérez");
  });

  it("indica que carga mientras consulta la sesión", () => {
    session.isLoading = true;
    render(<AccountEditor />);
    expect(screen.getByText("Cargando tu cuenta…")).toBeTruthy();
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("invita a iniciar sesión si la sesión terminó", () => {
    session.user = null;
    render(<AccountEditor />);
    expect(screen.getByRole("link", { name: "Inicia sesión de nuevo" }).getAttribute("href")).toBe(
      "/login?next=%2Faccount%2Fedit",
    );
  });
});

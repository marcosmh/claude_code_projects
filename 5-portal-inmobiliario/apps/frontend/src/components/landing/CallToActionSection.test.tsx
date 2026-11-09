// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  user: null as { id: string; name: string } | null | undefined,
  isLoading: false,
}));
vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => session }));

import { CallToActionSection } from "./CallToActionSection";

afterEach(() => {
  cleanup();
  session.user = null;
  session.isLoading = false;
});

describe("CallToActionSection", () => {
  it("a un visitante le muestra la invitación a iniciar sesión", () => {
    render(<CallToActionSection />);

    expect(screen.getByRole("heading", { name: "Guarda tus favoritas" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ingresar" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Ver propiedades" })).toBeTruthy();
  });

  it("con sesión iniciada no muestra la invitación, pero sí el acceso al catálogo", () => {
    session.user = { id: "u1", name: "Ana" };
    render(<CallToActionSection />);

    expect(screen.queryByText("Guarda tus favoritas")).toBeNull();
    expect(screen.queryByRole("link", { name: "Ingresar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ver propiedades" })).toBeTruthy();
  });

  it("mientras consulta la sesión la oculta a la vista y a las tecnologías de apoyo", () => {
    session.user = undefined;
    session.isLoading = true;
    render(<CallToActionSection />);

    expect(screen.queryByRole("heading", { name: "Guarda tus favoritas" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Ingresar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ver propiedades" })).toBeTruthy();
  });
});

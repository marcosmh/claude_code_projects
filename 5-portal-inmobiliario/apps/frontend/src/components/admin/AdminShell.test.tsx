// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/admin", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

const session = vi.hoisted(() => ({
  user: { id: "a1", name: "Admin Demo", role: "ADMIN" } as { name: string } | null,
  setUser: vi.fn(),
}));
vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => session }));

const logoutUserMock = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", () => ({ logoutUser: logoutUserMock }));

import { AdminShell } from "./AdminShell";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  navigation.pathname = "/admin";
  navigation.push.mockReset();
  session.setUser.mockReset();
  logoutUserMock.mockReset();
});

const renderShell = () => render(<AdminShell>contenido</AdminShell>);

describe("AdminShell: menú", () => {
  it("muestra los siete módulos de administración y el contenido", () => {
    renderShell();
    const menu = screen.getByRole("navigation", { name: "Menú de administración" });
    expect(menu.querySelectorAll("li")).toHaveLength(7);
    expect(screen.getByText("contenido")).toBeTruthy();
    expect(screen.getByRole("main").id).toBe("main-content");
  });

  it("marca el Dashboard como página actual y deja habilitadas las propiedades y deshabilita los módulos aún no construidos", () => {
    renderShell();
    const dashboard = screen.getByRole("link", { name: /Dashboard/ });
    expect(dashboard.getAttribute("href")).toBe("/admin");
    expect(dashboard.getAttribute("aria-current")).toBe("page");

    expect(screen.getByRole("link", { name: /Administrar propiedades/ }).getAttribute("href")).toBe(
      "/admin/properties",
    );
    expect(screen.getByRole("link", { name: /Administrar usuarios/ }).getAttribute("href")).toBe(
      "/admin/users",
    );
    for (const label of ["Auditoría y logs", "Reportes y estadísticas"]) {
      expect(screen.queryByRole("link", { name: new RegExp(label) })).toBeNull();
    }
    expect(document.querySelectorAll('[aria-disabled="true"]')).toHaveLength(4);
    expect(screen.getAllByText("Próximamente")).toHaveLength(4);
  });

  it("no ofrece ninguna opción de usuario final", () => {
    renderShell();
    for (const label of [/Mi cuenta/, /favorit/i, /Mis consultas/, /Historial/]) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });
});

describe("AdminShell: colapsar", () => {
  it("contrae y expande el menú y recuerda la preferencia", async () => {
    const user = userEvent.setup();
    const { unmount } = renderShell();

    const toggle = screen.getByRole("button", { name: "Contraer menú lateral" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await user.click(toggle);

    expect(
      screen.getByRole("button", { name: "Expandir menú lateral" }).getAttribute("aria-expanded"),
    ).toBe("false");
    expect(window.localStorage.getItem("admin-sidebar-collapsed")).toBe("true");

    // Una visita posterior respeta la preferencia guardada.
    unmount();
    renderShell();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Expandir menú lateral" })).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Expandir menú lateral" }));
    expect(window.localStorage.getItem("admin-sidebar-collapsed")).toBe("false");
  });
});

describe("AdminShell: panel móvil", () => {
  it("se abre con el botón y se cierra con Esc", async () => {
    const user = userEvent.setup();
    renderShell();

    const open = screen.getByRole("button", { name: "Abrir menú de administración" });
    expect(open.getAttribute("aria-expanded")).toBe("false");
    await user.click(open);
    expect(open.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(open.getAttribute("aria-expanded")).toBe("false"));
  });
});

describe("AdminShell: tema", () => {
  it("incluye el selector de tema y permite cambiarlo", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: /Tema de color/ }));
    await user.click(screen.getByRole("menuitemradio", { name: /Oscuro/ }));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

describe("AdminShell: barra superior", () => {
  it("muestra el nombre y el rol, y cierra la sesión yendo a /login", async () => {
    logoutUserMock.mockResolvedValue(undefined);
    renderShell();

    expect(screen.getByText("Admin Demo")).toBeTruthy();
    expect(screen.getByText("Administrador")).toBeTruthy();

    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/login"));
    expect(session.setUser).toHaveBeenCalledWith(null);
  });

  it("mantiene la sesión si falla el cierre", async () => {
    logoutUserMock.mockRejectedValue(new Error("red"));
    renderShell();

    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(logoutUserMock).toHaveBeenCalledOnce());
    expect(navigation.push).not.toHaveBeenCalled();
  });
});

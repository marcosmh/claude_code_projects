import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { useToastStore } from "@/store/toastStore";
import { useUiStore } from "@/store/uiStore";
import { AppShell } from "./AppShell";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { TopBar } from "./TopBar";

beforeEach(() => {
  document.documentElement.classList.remove("dark", "menu-collapsed");
  localStorage.clear();
  useUiStore.setState({ theme: "light", menuCollapsed: false });
  useToastStore.setState({ toasts: [] });
});

function renderRoutes(initial: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { path: "dashboard", element: <p>Pantalla dashboard</p> },
          { path: "invoices", element: <p>Pantalla facturas</p> },
        ],
      },
    ],
    { initialEntries: [initial] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("ThemeToggle", () => {
  it("es un switch que refleja y cambia el tema", async () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("switch", { name: "Tema oscuro" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement).toHaveClass("dark");
  });
});

describe("TopBar", () => {
  it("el botón del menú alterna el texto, aria-expanded y la clase de <html>", async () => {
    render(<TopBar />);
    const button = screen.getByRole("button", { name: "Ocultar menú" });
    expect(button).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(button);

    expect(screen.getByRole("button", { name: "Mostrar menú" })).toHaveAttribute("aria-expanded", "false");
    expect(document.documentElement).toHaveClass("menu-collapsed");
  });
});

describe("Sidebar", () => {
  it("enlaza a las secciones y marca la actual", () => {
    const router = createMemoryRouter([{ path: "*", element: <Sidebar /> }], { initialEntries: ["/invoices/5"] });
    render(<RouterProvider router={router} />);

    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Facturas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("switch", { name: "Tema oscuro" })).toBeInTheDocument();
  });
});

describe("AppShell", () => {
  it("renderiza el enlace de salto, la navegación y la ruta hija dentro de main", () => {
    renderRoutes("/dashboard");

    expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveAttribute("href", "#contenido");
    expect(screen.getByRole("main")).toHaveTextContent("Pantalla dashboard");
    expect(screen.getByRole("button", { name: "Ocultar menú" })).toBeInTheDocument();
  });

  it("navega entre secciones sin recargar", async () => {
    renderRoutes("/dashboard");

    await userEvent.click(screen.getByRole("link", { name: "Facturas" }));

    expect(await screen.findByText("Pantalla facturas")).toBeInTheDocument();
  });

  it("muestra los avisos del store y conserva el aviso al navegar", async () => {
    renderRoutes("/dashboard");
    useToastStore.getState().push("success", "Factura FAC-0001 creada.");

    expect(await screen.findByRole("status")).toHaveTextContent("Factura FAC-0001 creada.");
    await userEvent.click(screen.getByRole("link", { name: "Facturas" }));
    await screen.findByText("Pantalla facturas");

    expect(screen.getByRole("status")).toHaveTextContent("Factura FAC-0001 creada.");
  });
});

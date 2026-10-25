import { QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { queryKeys } from "@/hooks/queryKeys";
import { createQueryClient } from "@/queryClient";
import { useToastStore } from "@/store/toastStore";
import { useUiStore } from "@/store/uiStore";
import { AppShell } from "./AppShell";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { TopBar } from "./TopBar";

// TopBar y AppShell muestran el menú de usuario: necesitan un cliente de consultas con sesión.
function render(ui: ReactElement) {
  const client = createQueryClient();
  client.setQueryData(queryKeys.session, { id: 1, email: "ana@example.com" });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

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

  it("aloja el interruptor de tema, que sigue accesible con el menú plegado", async () => {
    render(<TopBar />);
    await userEvent.click(screen.getByRole("button", { name: "Ocultar menú" }));

    expect(screen.getByRole("switch", { name: "Tema oscuro" })).toBeInTheDocument();
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
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});

describe("AppShell", () => {
  it("renderiza el enlace de salto, la navegación y la ruta hija dentro de main", () => {
    renderRoutes("/dashboard");

    expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveAttribute("href", "#contenido");
    expect(screen.getByRole("main")).toHaveTextContent("Pantalla dashboard");
    expect(screen.getByRole("button", { name: "Ocultar menú" })).toBeInTheDocument();
  });

  it("mueve el foco al contenido al cambiar de ruta, pero no al cargar la primera", async () => {
    renderRoutes("/dashboard");
    const main = screen.getByRole("main");
    expect(main).not.toHaveFocus();

    await userEvent.click(screen.getByRole("link", { name: "Facturas" }));
    await screen.findByText("Pantalla facturas");

    expect(main).toHaveFocus();
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

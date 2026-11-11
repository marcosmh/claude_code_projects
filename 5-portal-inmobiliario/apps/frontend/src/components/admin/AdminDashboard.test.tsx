// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const swr = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as unknown,
  mutate: vi.fn(),
  isValidating: false,
}));
vi.mock("swr", () => ({ default: () => swr }));
vi.mock("./RecentPropertiesTable", () => ({
  RecentPropertiesTable: () => <section aria-label="Tabla de propiedades" />,
}));
vi.mock("@portal/api-client", () => ({
  adminDashboardUrl: "/api/admin/dashboard",
  fetchAdminDashboard: vi.fn(),
}));

import { AdminDashboard } from "./AdminDashboard";

afterEach(() => {
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
  swr.mutate.mockReset();
});

const valueOf = (label: string) =>
  screen.getByText(label).closest("div[class*='rounded-xl']")?.querySelector("dd");

describe("AdminDashboard", () => {
  it("muestra el título y los seis indicadores con sus valores", () => {
    swr.data = {
      totalProperties: 12,
      publishedProperties: 9,
      propertiesForSale: 6,
      propertiesForRent: 3,
      users: 1500,
      inquiries: 4,
    };
    render(<AdminDashboard />);

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeTruthy();
    expect(screen.getAllByRole("term")).toHaveLength(6);
    expect(valueOf("Total de propiedades")?.textContent).toBe("12");
    expect(valueOf("Usuarios")?.textContent).toMatch(/1\D?500/);
  });

  it("marca la lista como ocupada mientras carga", () => {
    render(<AdminDashboard />);
    expect(screen.getByRole("status").parentElement?.getAttribute("aria-busy")).toBe("true");
  });

  it("avisa si no se pueden cargar los indicadores", () => {
    swr.error = new Error("falló");
    render(<AdminDashboard />);
    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar");
  });

  it("agrupa los indicadores en secciones Propiedades y Actividad", () => {
    render(<AdminDashboard />);
    expect(screen.getByRole("heading", { level: 2, name: "Propiedades" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Actividad" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Cargando indicadores…");
  });

  it("muestra el porcentaje de propiedades publicadas", () => {
    swr.data = {
      totalProperties: 20,
      publishedProperties: 15,
      propertiesForSale: 8,
      propertiesForRent: 7,
      users: 1,
      inquiries: 1,
    };
    render(<AdminDashboard />);
    expect(screen.getByRole("img", { name: /75\s?% de las propiedades/ })).toBeTruthy();
  });

  it("no ofrece enlaces a funciones de usuario final", () => {
    render(<AdminDashboard />);
    expect(screen.queryByRole("link", { name: "Mi cuenta" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Ver catálogo" })).toBeNull();
  });

  it("permite reintentar cuando falla la carga", () => {
    swr.error = new Error("falló");
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(swr.mutate).toHaveBeenCalledTimes(1);
  });
});

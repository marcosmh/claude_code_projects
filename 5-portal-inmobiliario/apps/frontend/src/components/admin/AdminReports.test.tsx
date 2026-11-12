// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminReportsDto } from "@portal/shared-types";

const swr = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as unknown,
  mutate: vi.fn(),
  isValidating: false,
}));
vi.mock("swr", () => ({ default: () => swr }));
vi.mock("@portal/api-client", () => ({
  adminReportsUrl: "/api/admin/reports",
  fetchAdminReports: vi.fn(),
}));

import { AdminReports } from "./AdminReports";

afterEach(() => {
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
  swr.isValidating = false;
  swr.mutate.mockReset();
});

const reports: AdminReportsDto = {
  generatedAt: "2026-11-12T10:00:00.000Z",
  properties: {
    byOperation: [
      { key: "SALE", count: 6 },
      { key: "RENT", count: 2 },
    ],
    byType: [
      { key: "HOUSE", count: 5 },
      { key: "APARTMENT", count: 3 },
      { key: "LAND", count: 0 },
      { key: "OFFICE", count: 0 },
      { key: "COMMERCIAL", count: 0 },
      { key: "OTHER", count: 0 },
    ],
    byAvailability: [
      { key: "AVAILABLE", count: 7 },
      { key: "SOLD", count: 1 },
      { key: "RENTED", count: 0 },
    ],
    byVisibility: [
      { key: "PUBLISHED", count: 6 },
      { key: "DRAFT", count: 2 },
    ],
    topCities: [{ key: "Mérida", count: 4 }],
    averagePrices: [{ operation: "SALE", currency: "MXN", average: 2500000, count: 4 }],
  },
  inquiries: {
    total: 10,
    last30Days: 3,
    fromUsers: 4,
    fromVisitors: 6,
    topProperties: [{ id: "p1", title: "Casa en Polanco", count: 5 }],
  },
  favorites: { total: 9, topProperties: [{ id: "p2", title: "Depto Roma", count: 3 }] },
  users: { total: 20, active: 18, inactive: 2, admins: 1 },
  monthly: [
    { month: "2026-06", properties: 0, inquiries: 1, users: 2 },
    { month: "2026-07", properties: 1, inquiries: 0, users: 0 },
    { month: "2026-08", properties: 0, inquiries: 0, users: 0 },
    { month: "2026-09", properties: 2, inquiries: 3, users: 1 },
    { month: "2026-10", properties: 0, inquiries: 0, users: 0 },
    { month: "2026-11", properties: 4, inquiries: 6, users: 5 },
  ],
};

describe("AdminReports", () => {
  it("muestra el estado de carga sin datos", () => {
    render(<AdminReports />);
    expect(screen.getByRole("status").textContent).toContain("Cargando reportes");
  });

  it("muestra el error y permite reintentar", () => {
    swr.error = new Error("fallo");
    render(<AdminReports />);
    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar los reportes");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(swr.mutate).toHaveBeenCalled();
  });

  it("muestra el resumen con los totales", () => {
    swr.data = reports;
    render(<AdminReports />);
    const summary = screen.getByRole("region", { name: "Resumen" });
    expect(within(summary).getByText("Propiedades").nextElementSibling?.textContent).toBe("8");
    expect(within(summary).getByText("Consultas").nextElementSibling?.textContent).toBe("10");
    expect(within(summary).getByText("3 en los últimos 30 días")).toBeTruthy();
    expect(within(summary).getByText("Usuarios").nextElementSibling?.textContent).toBe("20");
  });

  it("escribe los valores y porcentajes de cada gráfica, no solo barras", () => {
    swr.data = reports;
    render(<AdminReports />);
    const byOperation = screen.getByRole("region", { name: "Propiedades por operación" });
    expect(byOperation.textContent).toContain("Venta");
    expect(byOperation.textContent).toContain("6 (75%)");
    expect(byOperation.textContent).toContain("Arriendo");
    expect(byOperation.textContent).toContain("2 (25%)");
  });

  it("lista las propiedades más consultadas con enlace a su ficha", () => {
    swr.data = reports;
    render(<AdminReports />);
    const link = screen.getByRole("link", { name: /Casa en Polanco/ });
    expect(link.getAttribute("href")).toBe("/properties/p1");
    expect(screen.getByRole("link", { name: /Depto Roma/ })).toBeTruthy();
  });

  it("incluye la tabla accesible con los números por mes", () => {
    swr.data = reports;
    render(<AdminReports />);
    const table = screen.getByRole("table", { name: "Actividad de los últimos meses" });
    expect(within(table).getAllByRole("row")).toHaveLength(7);
    expect(within(table).getByRole("columnheader", { name: "Consultas" })).toBeTruthy();
  });

  it("muestra el precio promedio por operación y moneda", () => {
    swr.data = reports;
    render(<AdminReports />);
    const table = screen.getByRole("table", { name: "Precio promedio por operación y moneda" });
    expect(table.textContent).toContain("Venta (MXN)");
    expect(table.textContent).toMatch(/2[\s.,]?500[\s.,]?000/);
  });

  it("muestra textos vacíos cuando no hay datos", () => {
    swr.data = {
      ...reports,
      properties: {
        ...reports.properties,
        byOperation: reports.properties.byOperation.map((entry) => ({ ...entry, count: 0 })),
        topCities: [],
        averagePrices: [],
      },
      inquiries: { ...reports.inquiries, topProperties: [] },
    };
    render(<AdminReports />);
    expect(screen.getByText("No hay propiedades publicadas.")).toBeTruthy();
    expect(screen.getByText("Todavía no hay consultas.")).toBeTruthy();
  });

  it("«Actualizar» vuelve a pedir los datos", () => {
    swr.data = reports;
    render(<AdminReports />);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(swr.mutate).toHaveBeenCalled();
  });
});

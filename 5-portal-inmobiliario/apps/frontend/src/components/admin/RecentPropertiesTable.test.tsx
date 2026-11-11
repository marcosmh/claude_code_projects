// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const swr = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as unknown,
  mutate: vi.fn(),
  isValidating: false,
  key: "" as string,
}));
vi.mock("swr", () => ({
  default: (key: string) => {
    swr.key = key;
    return swr;
  },
}));
vi.mock("@portal/api-client", () => ({
  buildAdminPropertiesUrl: ({ status, pageSize }: { status: string; pageSize: number }) =>
    `/api/admin/properties?pageSize=${pageSize}&status=${status}`,
  fetchAdminProperties: vi.fn(),
}));

import { RecentPropertiesTable } from "./RecentPropertiesTable";

afterEach(() => {
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
  swr.mutate.mockReset();
});

const property = (id: string, isPublished: boolean) => ({
  id,
  title: `Propiedad ${id}`,
  operation: "RENT",
  price: 15000,
  currency: "MXN",
  commune: "Roma",
  city: "CDMX",
  isPublished,
  updatedAt: "2026-03-01T12:00:00.000Z",
});

describe("RecentPropertiesTable", () => {
  it("indica que carga mientras no hay datos", () => {
    render(<RecentPropertiesTable />);
    expect(screen.getByRole("status").textContent).toBe("Cargando propiedades…");
  });

  it("muestra una fila por propiedad con su estado, precio y fecha", () => {
    swr.data = { items: [property("a", true), property("b", false)] };
    render(<RecentPropertiesTable />);

    const table = screen.getByRole("table", { name: "Propiedades modificadas recientemente" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("Publicada")).toBeTruthy();
    expect(within(table).getByText("Borrador")).toBeTruthy();
    expect(within(table).getAllByText(/\$15,000/)).toHaveLength(2);
    expect(within(table).getAllByText("Roma, CDMX")).toHaveLength(2);
  });

  it("filtra por estado pidiéndolo a la API", () => {
    swr.data = { items: [] };
    render(<RecentPropertiesTable />);
    expect(swr.key).toContain("status=all");

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "draft" } });
    expect(swr.key).toContain("status=draft");
  });

  it("muestra el estado vacío", () => {
    swr.data = { items: [] };
    render(<RecentPropertiesTable />);
    expect(screen.getByText("No hay propiedades con ese estado.")).toBeTruthy();
  });

  it("permite reintentar si falla la carga", () => {
    swr.error = new Error("falló");
    render(<RecentPropertiesTable />);
    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(swr.mutate).toHaveBeenCalledTimes(1);
  });
});

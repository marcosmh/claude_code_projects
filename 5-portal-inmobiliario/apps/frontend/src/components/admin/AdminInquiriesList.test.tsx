// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).fakeNavigation);

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
  buildAdminInquiriesUrl: ({ page, search }: { page: number; search?: string }) =>
    `/api/admin/inquiries?page=${page}&search=${search ?? ""}`,
  fetchAdminInquiries: vi.fn(),
}));

import { AdminInquiriesList } from "./AdminInquiriesList";
import { setFakeSearch } from "@/test/fake-navigation";

afterEach(() => {
  setFakeSearch("");
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
  swr.mutate.mockReset();
});

const inquiry = (id: string, overrides = {}) => ({
  id,
  createdAt: "2026-03-01T12:00:00.000Z",
  message: `Mensaje ${id}`,
  name: `Persona ${id}`,
  email: `${id}@example.com`,
  phone: "+52 55 1234 5678",
  propertyId: `p-${id}`,
  propertyTitle: `Casa ${id}`,
  propertyDeleted: false,
  userId: "u1",
  userName: "Ana López",
  ...overrides,
});

describe("AdminInquiriesList", () => {
  it("muestra el encabezado y el estado de carga", () => {
    render(<AdminInquiriesList />);
    expect(screen.getByRole("heading", { level: 1, name: "Administrar consultas" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Cargando consultas…");
  });

  it("muestra propiedad enlazada, contacto, usuario, mensaje y fecha", () => {
    swr.data = { items: [inquiry("a")], totalPages: 1 };
    render(<AdminInquiriesList />);
    const table = screen.getByRole("table", { name: "Consultas recibidas" });
    expect(within(table).getByRole("link", { name: "Casa a" }).getAttribute("href")).toBe(
      "/admin/properties/p-a/edit",
    );
    expect(within(table).getByRole("link", { name: "a@example.com" }).getAttribute("href")).toBe(
      "mailto:a@example.com",
    );
    expect(within(table).getByRole("link", { name: "+52 55 1234 5678" }).getAttribute("href")).toBe(
      "tel:+525512345678",
    );
    expect(within(table).getByText("Ana López")).toBeTruthy();
    expect(within(table).getByText("Mensaje a")).toBeTruthy();
  });

  it("marca visitantes y propiedades eliminadas sin enlace", () => {
    swr.data = {
      items: [inquiry("b", { userName: null, userId: null, phone: null, propertyDeleted: true })],
      totalPages: 1,
    };
    render(<AdminInquiriesList />);
    expect(screen.getByText("Visitante")).toBeTruthy();
    expect(screen.getByText("Eliminada")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Casa b/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /\+52/ })).toBeNull();
  });

  it("busca y pagina volviendo a la página 1", () => {
    swr.data = { items: [], totalPages: 3 };
    render(<AdminInquiriesList />);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(swr.key).toContain("page=2");
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Buscar consultas"), { target: { value: " roma " } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(swr.key).toContain("page=1");
    expect(swr.key).toContain("search=roma");
  });

  it("muestra el estado vacío y el error con reintento", () => {
    swr.data = { items: [], totalPages: 1 };
    const { unmount } = render(<AdminInquiriesList />);
    expect(screen.getByText(/No hay consultas que coincidan/)).toBeTruthy();
    unmount();
    swr.data = undefined;
    swr.error = new Error("fallo");
    render(<AdminInquiriesList />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(swr.mutate).toHaveBeenCalled();
  });
});

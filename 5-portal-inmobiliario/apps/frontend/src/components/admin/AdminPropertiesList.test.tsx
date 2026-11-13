// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).fakeNavigation);

const swr = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as unknown,
  mutate: vi.fn(),
  isValidating: false,
  key: "" as string,
  mutateMatching: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("swr", () => ({
  default: (key: string) => {
    swr.key = key;
    return swr;
  },
  useSWRConfig: () => ({ mutate: swr.mutateMatching }),
}));
const deleteAdminProperty = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", () => ({
  adminPropertiesUrl: "/api/admin/properties",
  buildAdminPropertiesUrl: ({
    page,
    search,
    status,
    availability = [],
  }: {
    page: number;
    search?: string;
    status: string;
    availability?: string[];
  }) =>
    `/api/admin/properties?page=${page}&search=${search ?? ""}&status=${status}&availability=${availability.join(",")}`,
  fetchAdminProperties: vi.fn(),
  deleteAdminProperty,
}));

import { AdminPropertiesList } from "./AdminPropertiesList";
import { getFakeSearch, setFakeSearch } from "@/test/fake-navigation";

afterEach(() => {
  setFakeSearch("");
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
  swr.mutate.mockReset();
  swr.mutateMatching.mockClear();
  deleteAdminProperty.mockReset();
});

const property = (id: string, isPublished: boolean) => ({
  id,
  title: `Propiedad ${id}`,
  operation: "SALE",
  price: 2500000,
  currency: "MXN",
  commune: "Roma",
  city: "CDMX",
  isPublished,
  updatedAt: "2026-03-01T12:00:00.000Z",
});

describe("AdminPropertiesList", () => {
  it("muestra el encabezado y el enlace para crear una propiedad", () => {
    render(<AdminPropertiesList />);
    expect(screen.getByRole("heading", { level: 1, name: "Administrar propiedades" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Nueva propiedad" }).getAttribute("href")).toBe(
      "/admin/properties/new",
    );
    expect(screen.getByRole("status").textContent).toBe("Cargando propiedades…");
  });

  it("lista las propiedades con estado y enlace de edición", () => {
    swr.data = { items: [property("a", true), property("b", false)], totalPages: 1 };
    render(<AdminPropertiesList />);

    const table = screen.getByRole("table", { name: "Propiedades del portal" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("Borrador")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Editar Propiedad a" }).getAttribute("href")).toBe(
      "/admin/properties/a/edit",
    );
  });

  it("busca por texto y filtra por estado volviendo a la página 1", () => {
    swr.data = { items: [], totalPages: 1 };
    render(<AdminPropertiesList />);

    fireEvent.change(screen.getByLabelText("Buscar propiedades"), { target: { value: " roma " } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(swr.key).toContain("search=roma");

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "draft" } });
    expect(swr.key).toContain("status=draft");
  });

  it("pagina con los botones Anterior y Siguiente", () => {
    swr.data = { items: [property("a", true)], totalPages: 3 };
    render(<AdminPropertiesList />);

    expect((screen.getByRole("button", { name: "← Anterior" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(swr.key).toContain("page=2");
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();
  });

  it("guarda búsqueda, estado y filtros avanzados en la URL y los conserva al paginar", async () => {
    swr.data = { items: [property("a", true)], totalPages: 3 };
    render(<AdminPropertiesList />);
    fireEvent.change(screen.getByLabelText("Buscar propiedades"), { target: { value: "roma" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "draft" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Vendida" }));
    await waitFor(() => expect(getFakeSearch()).toContain("availability=SOLD"));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));

    expect(Object.fromEntries(new URLSearchParams(getFakeSearch()))).toEqual({
      search: "roma",
      status: "draft",
      availability: "SOLD",
      page: "2",
    });
    expect(swr.key).toContain("page=2");
    expect(swr.key).toContain("search=roma");
  });

  it("restaura los filtros avanzados desde la URL e ignora valores inválidos", () => {
    setFakeSearch("availability=SOLD,NOPE&minPrice=abc&page=2");
    swr.data = { items: [property("a", true)], totalPages: 3 };
    render(<AdminPropertiesList />);
    expect(swr.key).toContain("page=2");
    expect(swr.key).toContain("availability=SOLD");
    expect(swr.key).not.toContain("NOPE");
    expect(swr.key).not.toContain("minPrice");
  });

  it("pide confirmación antes de eliminar y revalida la lista", async () => {
    deleteAdminProperty.mockResolvedValue(undefined);
    swr.data = { items: [property("a", true), property("b", true)], totalPages: 1 };
    render(<AdminPropertiesList />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Propiedad a" }));
    expect(deleteAdminProperty).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() => expect(deleteAdminProperty).toHaveBeenCalledWith("a"));
    await waitFor(() => expect(swr.mutateMatching).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("cancelar no elimina nada", () => {
    swr.data = { items: [property("a", true)], totalPages: 1 };
    render(<AdminPropertiesList />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Propiedad a" }));
    fireEvent.click(screen.getByRole("button", { name: "No, cancelar" }));
    expect(deleteAdminProperty).not.toHaveBeenCalled();
  });

  it("avisa si la eliminación falla", async () => {
    deleteAdminProperty.mockRejectedValue(new Error("fallo"));
    swr.data = { items: [property("a", true)], totalPages: 1 };
    render(<AdminPropertiesList />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Propiedad a" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos eliminar");
  });

  it("muestra el estado vacío y el error con reintento", () => {
    swr.data = { items: [], totalPages: 1 };
    const { unmount } = render(<AdminPropertiesList />);
    expect(screen.getByText(/No hay propiedades que coincidan/)).toBeTruthy();
    unmount();

    swr.data = undefined;
    swr.error = new Error("fallo");
    render(<AdminPropertiesList />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(swr.mutate).toHaveBeenCalled();
  });

  it("tiene un panel de filtros colapsable que cuenta los filtros activos", () => {
    swr.data = { items: [], totalPages: 1 };
    render(<AdminPropertiesList />);

    const toggle = screen.getByRole("button", { name: /Ocultar filtros/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("form", { name: "Filtros avanzados de propiedades" })).toBeTruthy();

    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: /Mostrar filtros/ }).getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("pide la lista con los filtros avanzados y vuelve a la página 1", async () => {
    swr.data = { items: [], totalPages: 3 };
    render(<AdminPropertiesList />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(swr.key).toContain("page=2");
    fireEvent.click(screen.getByRole("checkbox", { name: "Vendida" }));
    await waitFor(() => expect(swr.key).toContain("page=1"));
    expect(screen.getByRole("button", { name: /Ocultar filtros, 1 activos/ })).toBeTruthy();
  });
});

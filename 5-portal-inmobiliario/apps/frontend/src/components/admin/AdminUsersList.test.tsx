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
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: { id: "yo", role: "ADMIN" } }),
}));
const updateAdminUser = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", () => ({
  adminUsersUrl: "/api/admin/users",
  buildAdminUsersUrl: ({
    page,
    search,
    role,
    status,
  }: {
    page: number;
    search?: string;
    role?: string;
    status: string;
  }) => `/api/admin/users?page=${page}&search=${search ?? ""}&role=${role ?? ""}&status=${status}`,
  fetchAdminUsers: vi.fn(),
  updateAdminUser,
  ApiRequestError: class extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
}));

import { ApiRequestError } from "@portal/api-client";
import { AdminUsersList } from "./AdminUsersList";
import { getFakeSearch, setFakeSearch } from "@/test/fake-navigation";

afterEach(() => {
  setFakeSearch("");
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
  swr.mutate.mockReset();
  swr.mutateMatching.mockClear();
  updateAdminUser.mockReset();
});

const user = (id: string, overrides = {}) => ({
  id,
  name: `Usuario ${id}`,
  email: `${id}@example.com`,
  role: "USER",
  isActive: true,
  createdAt: "2026-03-01T12:00:00.000Z",
  favoritesCount: 2,
  inquiriesCount: 1,
  ...overrides,
});

describe("AdminUsersList", () => {
  it("muestra el encabezado y el estado de carga", () => {
    render(<AdminUsersList />);
    expect(screen.getByRole("heading", { level: 1, name: "Administrar usuarios" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Cargando usuarios…");
    expect(screen.getByRole("link", { name: "Nuevo usuario" }).getAttribute("href")).toBe(
      "/admin/users/new",
    );
  });

  it("lista los usuarios con rol, estado y conteos", () => {
    swr.data = {
      items: [user("a"), user("b", { role: "ADMIN", isActive: false })],
      totalPages: 1,
    };
    render(<AdminUsersList />);
    const table = screen.getByRole("table", { name: "Usuarios del portal" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("Desactivada")).toBeTruthy();
    expect(within(table).getByText("Administrador")).toBeTruthy();
    expect(within(table).getAllByText("1 / 2")).toHaveLength(2);
  });

  it("busca y filtra por rol y cuenta volviendo a la página 1", () => {
    swr.data = { items: [], totalPages: 1 };
    render(<AdminUsersList />);
    fireEvent.change(screen.getByLabelText("Buscar usuarios"), { target: { value: " ana " } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(swr.key).toContain("search=ana");
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "ADMIN" } });
    expect(swr.key).toContain("role=ADMIN");
    fireEvent.change(screen.getByLabelText("Cuenta"), { target: { value: "inactive" } });
    expect(swr.key).toContain("status=inactive");
  });

  it("pagina con Anterior y Siguiente", () => {
    swr.data = { items: [user("a")], totalPages: 3 };
    render(<AdminUsersList />);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(swr.key).toContain("page=2");
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();
  });

  it("conserva la búsqueda y los filtros al cambiar de página y los guarda en la URL", () => {
    swr.data = { items: [user("a")], totalPages: 3 };
    render(<AdminUsersList />);
    fireEvent.change(screen.getByLabelText("Buscar usuarios"), { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "ADMIN" } });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));

    expect(swr.key).toContain("page=2");
    expect(swr.key).toContain("search=ana");
    expect(swr.key).toContain("role=ADMIN");
    const params = new URLSearchParams(getFakeSearch());
    expect(Object.fromEntries(params)).toEqual({ search: "ana", role: "ADMIN", page: "2" });
  });

  it("cambiar un filtro vuelve a la página 1 y la omite de la URL", () => {
    setFakeSearch("page=3&search=ana");
    swr.data = { items: [user("a")], totalPages: 5 };
    render(<AdminUsersList />);
    expect((screen.getByLabelText("Buscar usuarios") as HTMLInputElement).value).toBe("ana");
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "USER" } });

    expect(swr.key).toContain("page=1");
    expect(new URLSearchParams(getFakeSearch()).has("page")).toBe(false);
    expect(new URLSearchParams(getFakeSearch()).get("search")).toBe("ana");
  });

  it("restaura la página de la URL y trata un valor inválido como la página 1", () => {
    setFakeSearch("page=2&role=NOPE");
    swr.data = { items: [user("a")], totalPages: 3 };
    render(<AdminUsersList />);
    expect(swr.key).toContain("page=2");
    expect(swr.key).toContain("role=&");
  });

  it("vuelve a la última página si la pedida supera el total", () => {
    setFakeSearch("page=9");
    swr.data = { items: [], totalPages: 2 };
    render(<AdminUsersList />);
    expect(new URLSearchParams(getFakeSearch()).get("page")).toBe("2");
  });

  it("pide confirmación antes de desactivar y revalida", async () => {
    updateAdminUser.mockResolvedValue({});
    swr.data = { items: [user("a")], totalPages: 1 };
    render(<AdminUsersList />);
    fireEvent.click(screen.getByRole("button", { name: "Desactivar a Usuario a" }));
    expect(updateAdminUser).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sí, desactivar" }));
    await waitFor(() => expect(updateAdminUser).toHaveBeenCalledWith("a", { isActive: false }));
    await waitFor(() => expect(swr.mutateMatching).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("activa una cuenta desactivada y cambia el rol con confirmación", async () => {
    updateAdminUser.mockResolvedValue({});
    swr.data = {
      items: [user("a", { isActive: false }), user("b", { role: "ADMIN" })],
      totalPages: 1,
    };
    render(<AdminUsersList />);
    fireEvent.click(screen.getByRole("button", { name: "Activar a Usuario a" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, activar" }));
    await waitFor(() => expect(updateAdminUser).toHaveBeenCalledWith("a", { isActive: true }));

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar rol de administrador a Usuario b" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar rol" }));
    await waitFor(() => expect(updateAdminUser).toHaveBeenCalledWith("b", { role: "USER" }));
  });

  it("cancelar no cambia nada", () => {
    swr.data = { items: [user("a")], totalPages: 1 };
    render(<AdminUsersList />);
    fireEvent.click(screen.getByRole("button", { name: "Hacer administrador a Usuario a" }));
    fireEvent.click(screen.getByRole("button", { name: "No, cancelar" }));
    expect(updateAdminUser).not.toHaveBeenCalled();
  });

  it("deshabilita las acciones sobre la cuenta propia", () => {
    swr.data = { items: [user("yo", { role: "ADMIN" })], totalPages: 1 };
    render(<AdminUsersList />);
    expect(screen.getByText("(tú)")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Desactivar a Usuario yo" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Quitar rol de administrador a Usuario yo",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("muestra el mensaje del servidor si el cambio falla", async () => {
    updateAdminUser.mockRejectedValue(new ApiRequestError("No puedes", 403));
    swr.data = { items: [user("a")], totalPages: 1 };
    render(<AdminUsersList />);
    fireEvent.click(screen.getByRole("button", { name: "Desactivar a Usuario a" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, desactivar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("No puedes");
  });

  it("muestra el estado vacío y el error con reintento", () => {
    swr.data = { items: [], totalPages: 1 };
    const { unmount } = render(<AdminUsersList />);
    expect(screen.getByText(/No hay usuarios que coincidan/)).toBeTruthy();
    unmount();
    swr.data = undefined;
    swr.error = new Error("fallo");
    render(<AdminUsersList />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(swr.mutate).toHaveBeenCalled();
  });
});

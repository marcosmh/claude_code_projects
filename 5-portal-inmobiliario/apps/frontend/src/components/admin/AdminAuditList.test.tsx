// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).fakeNavigation);
import type { AuditLogDto } from "@portal/shared-types";

const swr = vi.hoisted(() => ({
  key: "" as string,
  data: undefined as unknown,
  error: undefined as unknown,
  mutate: vi.fn(),
  isValidating: false,
}));
vi.mock("swr", () => ({
  default: (key: string) => {
    swr.key = key;
    return swr;
  },
}));
vi.mock("@portal/api-client", () => ({
  buildAdminAuditUrl: (query: Record<string, unknown>) => {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(name, String(value));
    }
    return `/api/admin/audit?${params.toString()}`;
  },
  fetchAdminAudit: vi.fn(),
}));

import { AdminAuditList } from "./AdminAuditList";
import { getFakeSearch, setFakeSearch } from "@/test/fake-navigation";

afterEach(() => {
  setFakeSearch("");
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
  swr.key = "";
  swr.mutate.mockReset();
});

const entry = (overrides: Partial<AuditLogDto> = {}): AuditLogDto => ({
  id: "a1",
  createdAt: "2026-11-12T10:00:00.000Z",
  action: "PROPERTY_UPDATED",
  category: "properties",
  summary: "Editó la propiedad «Casa Roma»",
  actorId: "u1",
  actorEmail: "admin@portal.mx",
  entityType: "property",
  entityId: "p1",
  ipAddress: "10.0.0.1",
  ...overrides,
});

const page = (items: AuditLogDto[], totalPages = 1) => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages,
});

describe("AdminAuditList", () => {
  it("muestra los estados de carga y de error con «Reintentar»", () => {
    render(<AdminAuditList />);
    expect(screen.getByRole("status").textContent).toContain("Cargando registro");
    cleanup();

    swr.error = new Error("fallo");
    render(<AdminAuditList />);
    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar el registro");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(swr.mutate).toHaveBeenCalled();
  });

  it("muestra un mensaje cuando no hay eventos", () => {
    swr.data = page([]);
    render(<AdminAuditList />);
    expect(screen.getByText("No hay eventos que coincidan con los filtros.")).toBeTruthy();
  });

  it("lista cada evento con acción en español, resumen, responsable e IP", () => {
    swr.data = page([entry()]);
    render(<AdminAuditList />);

    const table = screen.getByRole("table");
    const row = within(table).getAllByRole("row")[1];
    expect(within(row).getByText("Propiedad editada")).toBeTruthy();
    expect(within(row).getByText("Propiedades")).toBeTruthy();
    expect(row.textContent).toContain("Editó la propiedad «Casa Roma»");
    expect(row.textContent).toContain("admin@portal.mx");
    expect(row.textContent).toContain("10.0.0.1");
    expect(within(row).getByRole("link", { name: "Ver propiedad" }).getAttribute("href")).toBe(
      "/admin/properties/p1/edit",
    );
    expect(screen.getByText("1 evento(s)")).toBeTruthy();
  });

  it("no enlaza entidades que no tienen ficha y muestra «—» sin responsable ni IP", () => {
    swr.data = page([
      entry({
        action: "LOGIN_FAILED",
        category: "auth",
        summary: "Intento de inicio de sesión fallido",
        entityType: null,
        entityId: null,
        actorId: null,
        ipAddress: null,
      }),
    ]);
    render(<AdminAuditList />);
    expect(screen.queryByRole("link", { name: "Ver propiedad" })).toBeNull();
    expect(screen.getByText("Inicio de sesión fallido")).toBeTruthy();
  });

  it("filtra por categoría y por fechas al instante", () => {
    swr.data = page([]);
    render(<AdminAuditList />);

    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "users" } });
    expect(swr.key).toContain("category=users");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-12" } });
    expect(swr.key).toContain("from=2026-11-01");
    expect(swr.key).toContain("to=2026-11-12");
  });

  it("busca al enviar el formulario y «Limpiar filtros» lo reinicia todo", () => {
    swr.data = page([]);
    render(<AdminAuditList />);

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: " ana " } });
    expect(swr.key).not.toContain("search=");
    fireEvent.submit(screen.getByRole("search"));
    expect(swr.key).toContain("search=ana");

    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "settings" } });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(swr.key).not.toContain("search=");
    expect(swr.key).not.toContain("category=");
    expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("");
  });

  it("avisa de un rango invertido y no lo envía a la API", () => {
    swr.data = page([]);
    render(<AdminAuditList />);

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-12" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-01" } });

    expect(screen.getByRole("alert").textContent).toContain("no puede ser posterior");
    expect(swr.key).not.toContain("from=");
    expect(swr.key).not.toContain("to=");
  });

  it("pagina cuando hay más de una página", () => {
    swr.data = page([entry()], 3);
    render(<AdminAuditList />);

    const pagination = screen.getByRole("navigation", { name: "Paginación" });
    expect(pagination.textContent).toContain("Página 1 de 3");
    expect(
      (within(pagination).getByRole("button", { name: /Anterior/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(within(pagination).getByRole("button", { name: /Siguiente/ }));
    expect(swr.key).toContain("page=2");
  });

  it("conserva la búsqueda y los filtros en la URL al cambiar de página", () => {
    swr.data = { ...page([entry()]), totalPages: 3 };
    render(<AdminAuditList />);
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "auth" } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-01-01" } });
    const pagination = screen.getByRole("navigation", { name: "Paginación" });
    fireEvent.click(within(pagination).getByRole("button", { name: /Siguiente/ }));

    expect(Object.fromEntries(new URLSearchParams(getFakeSearch()))).toEqual({
      category: "auth",
      from: "2026-01-01",
      page: "2",
    });
  });

  it("«Actualizar» vuelve a pedir el registro", () => {
    swr.data = page([entry()]);
    render(<AdminAuditList />);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(swr.mutate).toHaveBeenCalled();
  });
});

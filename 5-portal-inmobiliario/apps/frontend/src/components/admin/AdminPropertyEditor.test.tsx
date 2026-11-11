// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const swr = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as unknown,
  key: null as unknown,
}));
vi.mock("swr", () => ({
  default: (key: unknown) => {
    swr.key = key;
    return swr;
  },
}));
vi.mock("@portal/api-client", () => {
  class ApiRequestError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return { ApiRequestError, fetchAdminProperty: vi.fn() };
});

import { ApiRequestError } from "@portal/api-client";
vi.mock("./PropertyForm", () => ({
  PropertyForm: ({ property }: { property?: { id: string } }) => (
    <form aria-label={property ? "form-edicion" : "form-nuevo"} />
  ),
}));
import { AdminPropertyEditor } from "./AdminPropertyEditor";

afterEach(() => {
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
});

describe("AdminPropertyEditor", () => {
  it("la página de creación no consulta la API", () => {
    render(<AdminPropertyEditor />);
    expect(swr.key).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Nueva propiedad" })).toBeTruthy();
    expect(screen.getByRole("form", { name: "form-nuevo" })).toBeTruthy();
  });

  it("la edición carga la propiedad y muestra su título", () => {
    swr.data = { id: "p1", title: "Casa en Polanco" };
    render(<AdminPropertyEditor propertyId="p1" />);
    expect(swr.key).toEqual(["admin-property", "p1"]);
    expect(screen.getByRole("heading", { level: 1, name: "Editar propiedad" })).toBeTruthy();
    expect(screen.getByText("Casa en Polanco")).toBeTruthy();
    expect(screen.getByRole("form", { name: "form-edicion" })).toBeTruthy();
  });

  it("indica que carga y que la propiedad no existe", () => {
    const { unmount } = render(<AdminPropertyEditor propertyId="p1" />);
    expect(screen.getByRole("status").textContent).toBe("Cargando propiedad…");
    unmount();

    swr.error = new ApiRequestError("No encontrada", 404);
    render(<AdminPropertyEditor propertyId="p1" />);
    expect(screen.getByRole("alert").textContent).toContain("No encontramos esta propiedad");
  });
});

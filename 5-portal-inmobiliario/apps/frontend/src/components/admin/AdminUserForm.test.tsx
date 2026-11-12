// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const mutateMatching = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate: mutateMatching }) }));
const createAdminUser = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", () => ({
  adminUsersUrl: "/api/admin/users",
  createAdminUser,
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
import { AdminUserForm } from "./AdminUserForm";

afterEach(() => {
  cleanup();
  router.push.mockReset();
  mutateMatching.mockClear();
  createAdminUser.mockReset();
});

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValid(role = "USER") {
  fill("Nombre", "Ana López");
  fill("Email", "ANA@example.com");
  fill("Contraseña", "clave-segura-1");
  fill("Rol", role);
}

describe("AdminUserForm", () => {
  it("muestra el encabezado y el rol Usuario por defecto", () => {
    render(<AdminUserForm />);
    expect(screen.getByRole("heading", { level: 1, name: "Nuevo usuario" })).toBeTruthy();
    expect((screen.getByLabelText("Rol") as HTMLSelectElement).value).toBe("USER");
  });

  it("valida los campos antes de enviar", async () => {
    render(<AdminUserForm />);
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));
    expect(await screen.findByText("Ingresa tu nombre")).toBeTruthy();
    fill("Contraseña", "corta");
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));
    await waitFor(() =>
      expect(screen.getByText("La contraseña debe tener al menos 8 caracteres")).toBeTruthy(),
    );
    expect(createAdminUser).not.toHaveBeenCalled();
  });

  it("crea un administrador, revalida el listado y vuelve a él", async () => {
    createAdminUser.mockResolvedValue({ id: "u1" });
    render(<AdminUserForm />);
    fillValid("ADMIN");
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/admin/users"));
    expect(createAdminUser).toHaveBeenCalledWith({
      name: "Ana López",
      email: "ana@example.com",
      password: "clave-segura-1",
      role: "ADMIN",
    });
    expect(mutateMatching).toHaveBeenCalled();
  });

  it("crea un usuario normal con el rol por defecto", async () => {
    createAdminUser.mockResolvedValue({ id: "u2" });
    render(<AdminUserForm />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));
    await waitFor(() =>
      expect(createAdminUser).toHaveBeenCalledWith(expect.objectContaining({ role: "USER" })),
    );
  });

  it("muestra el error de la API (email repetido) sin salir del formulario", async () => {
    createAdminUser.mockRejectedValue(
      new ApiRequestError("Ya existe una cuenta con este email", 409),
    );
    render(<AdminUserForm />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Ya existe una cuenta");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("usa un mensaje genérico ante un error del servidor", async () => {
    createAdminUser.mockRejectedValue(new ApiRequestError("detalle interno", 500));
    render(<AdminUserForm />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos crear");
  });
});

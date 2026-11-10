// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => search.params,
}));

const session = vi.hoisted(() => ({
  user: null as { id: string; name: string } | null,
  setUser: vi.fn(),
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: session.user, isLoading: false, setUser: session.setUser }),
}));

const registerUserMock = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", async () => {
  class ApiRequestError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return { registerUser: registerUserMock, ApiRequestError };
});

import { ApiRequestError } from "@portal/api-client";
import { RegisterForm } from "./RegisterForm";

afterEach(() => {
  cleanup();
  push.mockReset();
  search.params = new URLSearchParams();
  registerUserMock.mockReset();
  session.user = null;
  session.setUser.mockReset();
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nombre"), "Ana Pérez");
  await user.type(screen.getByLabelText("Email"), "ana@example.com");
  await user.type(screen.getByLabelText("Contraseña"), "clave-segura-1");
}

describe("RegisterForm", () => {
  it("crea la cuenta, deja la sesión iniciada y vuelve al inicio", async () => {
    const created = { id: "u9", email: "ana@example.com", name: "Ana Pérez", role: "USER" };
    registerUserMock.mockResolvedValue(created);
    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() =>
      expect(registerUserMock).toHaveBeenCalledWith({
        name: "Ana Pérez",
        email: "ana@example.com",
        password: "clave-segura-1",
      }),
    );
    expect(session.setUser).toHaveBeenCalledWith(created);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("vuelve a la ruta indicada en ?next= y la conserva en el enlace a login", async () => {
    search.params = new URLSearchParams({ next: "/account" });
    registerUserMock.mockResolvedValue({ id: "u9", email: "a@x.mx", name: "Ana", role: "USER" });
    const user = userEvent.setup();
    render(<RegisterForm />);
    expect(screen.getByRole("link", { name: "Inicia sesión" }).getAttribute("href")).toBe(
      "/login?next=%2Faccount",
    );
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/account"));
  });

  it("valida nombre, email y contraseña corta sin llamar a la API", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Nombre"), "A");
    await user.type(screen.getByLabelText("Email"), "x");
    await user.type(screen.getByLabelText("Contraseña"), "corta");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Ingresa tu nombre")).toBeTruthy();
    expect(screen.getByText("Ingresa un email válido")).toBeTruthy();
    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres")).toBeTruthy();
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it("relaciona la ayuda de la contraseña con el campo", () => {
    render(<RegisterForm />);
    const passwordField = screen.getByLabelText("Contraseña");
    const hintId = passwordField.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(hintId)?.textContent).toBe("Mínimo 8 caracteres.");
  });

  it("muestra el mensaje de la API cuando el email ya existe", async () => {
    registerUserMock.mockRejectedValue(
      new ApiRequestError("Ya existe una cuenta con este email", 409),
    );
    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Ya existe una cuenta con este email",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("muestra un mensaje genérico ante errores inesperados", async () => {
    registerUserMock.mockRejectedValue(new ApiRequestError("Error interno", 500));
    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos crear la cuenta. Inténtalo de nuevo.",
    );
  });

  it("enlaza al inicio de sesión", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("link", { name: "Inicia sesión" }).getAttribute("href")).toBe("/login");
  });

  it("no muestra el formulario si ya hay sesión", () => {
    session.user = { id: "u1", name: "Ana Pérez" };
    render(<RegisterForm />);
    expect(screen.getByText("Ya iniciaste sesión como Ana Pérez.")).toBeTruthy();
    expect(screen.queryByLabelText("Nombre")).toBeNull();
  });
});

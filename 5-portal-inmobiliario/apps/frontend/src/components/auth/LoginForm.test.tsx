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

const loginUserMock = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", async () => {
  class ApiRequestError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return { loginUser: loginUserMock, ApiRequestError };
});

import { ApiRequestError } from "@portal/api-client";
import { LoginForm } from "./LoginForm";

afterEach(() => {
  cleanup();
  push.mockReset();
  search.params = new URLSearchParams();
  loginUserMock.mockReset();
  session.user = null;
  session.setUser.mockReset();
});

describe("LoginForm", () => {
  it("inicia sesión, actualiza la sesión y vuelve al inicio", async () => {
    const signedIn = { id: "u1", email: "usuario@portal.mx", name: "Usuario Demo", role: "USER" };
    loginUserMock.mockResolvedValue(signedIn);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "  Usuario@Portal.mx ");
    await user.type(screen.getByLabelText("Contraseña"), "Usuario1234!");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() =>
      expect(loginUserMock).toHaveBeenCalledWith({
        email: "usuario@portal.mx",
        password: "Usuario1234!",
      }),
    );
    expect(session.setUser).toHaveBeenCalledWith(signedIn);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("valida el formulario y no llama a la API con datos inválidos", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "no-es-email");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Ingresa un email válido")).toBeTruthy();
    expect(screen.getByText("Ingresa tu contraseña")).toBeTruthy();
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
    expect(loginUserMock).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de la API ante credenciales incorrectas y no navega", async () => {
    loginUserMock.mockRejectedValue(new ApiRequestError("Email o contraseña incorrectos", 401));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "usuario@portal.mx");
    await user.type(screen.getByLabelText("Contraseña"), "mala");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Email o contraseña incorrectos");
    expect(push).not.toHaveBeenCalled();
    expect(session.setUser).not.toHaveBeenCalled();
  });

  it("muestra un mensaje genérico ante errores del servidor o de red", async () => {
    loginUserMock.mockRejectedValue(new Error("fallo de red"));
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "usuario@portal.mx");
    await user.type(screen.getByLabelText("Contraseña"), "Usuario1234!");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos iniciar sesión. Inténtalo de nuevo.",
    );
  });

  it("enlaza al registro", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: "Regístrate" }).getAttribute("href")).toBe("/register");
  });

  it("no muestra el formulario si ya hay sesión", () => {
    session.user = { id: "u1", name: "Usuario Demo" };
    render(<LoginForm />);
    expect(screen.getByText("Ya iniciaste sesión como Usuario Demo.")).toBeTruthy();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });

  it("vuelve a la ruta indicada en ?next= tras iniciar sesión", async () => {
    search.params = new URLSearchParams({ next: "/admin?page=2" });
    loginUserMock.mockResolvedValue({ id: "a1", email: "a@x.mx", name: "Admin", role: "ADMIN" });
    const user = userEvent.setup();
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: "Regístrate" }).getAttribute("href")).toBe(
      "/register?next=%2Fadmin%3Fpage%3D2",
    );
    await user.type(screen.getByLabelText("Email"), "a@x.mx");
    await user.type(screen.getByLabelText("Contraseña"), "Admin1234!");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin?page=2"));
  });

  it("ignora un ?next= externo para evitar redirecciones abiertas", async () => {
    search.params = new URLSearchParams({ next: "//malo.example" });
    loginUserMock.mockResolvedValue({ id: "u1", email: "u@x.mx", name: "U", role: "USER" });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "u@x.mx");
    await user.type(screen.getByLabelText("Contraseña"), "x");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("lleva a un ADMIN al panel de administración si no venía de otra ruta", async () => {
    loginUserMock.mockResolvedValue({ id: "a1", email: "a@x.mx", name: "Admin", role: "ADMIN" });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "a@x.mx");
    await user.type(screen.getByLabelText("Contraseña"), "Admin1234!");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
  });
});

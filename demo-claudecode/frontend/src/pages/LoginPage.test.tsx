import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/hooks/queryKeys";
import { createQueryClient } from "@/queryClient";
import { useToastStore } from "@/store/toastStore";
import { UserMenu } from "@/components/layout/UserMenu";
import { LoginPage } from "./LoginPage";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/services/tokenStorage";

afterEach(() => {
  vi.unstubAllGlobals();
  clearAccessToken();
  useToastStore.setState({ toasts: [] });
});

const reply = (body: unknown, status: number, headers?: Record<string, string>) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers }));

function renderLogin(session: unknown = null) {
  const client = createQueryClient();
  client.setQueryData(queryKeys.session, session);
  const router = createMemoryRouter(
    [
      { path: "/login", element: <LoginPage /> },
      { path: "/dashboard", element: <p>Panel</p> },
    ],
    { initialEntries: ["/login"] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, client, user: userEvent.setup() };
}

describe("LoginPage", () => {
  it("valida los campos antes de llamar a la API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { user } = renderLogin();

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Escribe tu email")).toBeInTheDocument();
    expect(screen.getByText("Escribe tu contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("credenciales incorrectas: muestra el aviso del servidor (con la regla de bloqueo) y conserva el email", async () => {
    vi.stubGlobal(
      "fetch",
      reply({ error: { code: "UNAUTHENTICATED", message: "Email o contraseña incorrectos. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos." } }, 401),
    );
    const { user, router } = renderLogin();

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "mala");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email o contraseña incorrectos. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.");
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.com");
    expect(router.state.location.pathname).toBe("/login");
  });

  it("demasiados intentos (429): muestra el mensaje de espera de la API", async () => {
    vi.stubGlobal("fetch", reply({}, 429, { "Retry-After": "30" }));
    const { user } = renderLogin();

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "x");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Espera 30 s");
  });

  it("sin conexión: muestra el error de red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { user } = renderLogin();

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "x");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar");
  });

  it("los datos cacheados de otra cuenta se descartan al iniciar sesión", async () => {
    vi.stubGlobal("fetch", reply({ data: { token: "jwt", user: { id: 2, email: "bea@example.com", role: "ADMIN" } } }, 200));
    const { user, client } = renderLogin();
    client.setQueryData(queryKeys.invoices, ["factura de otra cuenta"]);

    await user.type(screen.getByLabelText("Email"), "bea@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "x");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Panel")).toBeInTheDocument();
    expect(client.getQueryData(queryKeys.invoices)).toBeUndefined();
    expect(client.getQueryData(queryKeys.session)).toEqual({ id: 2, email: "bea@example.com", role: "ADMIN" });
    expect(getAccessToken()).toBe("jwt");
  });
});

describe("UserMenu", () => {
  it("si el servidor no responde al cerrar sesión, avisa pero la sesión termina en este dispositivo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const client = createQueryClient();
    client.setQueryData(queryKeys.session, { id: 1, email: "ana@example.com", role: "USER" });
    setAccessToken("jwt");
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <UserMenu />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await vi.waitFor(() => expect(useToastStore.getState().toasts[0]?.message).toContain("No se pudo conectar"));
    expect(client.getQueryData(queryKeys.session)).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("no muestra nada sin sesión", () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.session, null);
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <UserMenu />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "./queryClient";
import { createAppRouter, routes } from "./router";

const summary = {
  byStatus: { DRAFT: { count: 0, totalCents: 0 }, SENT: { count: 0, totalCents: 0 }, PAID: { count: 0, totalCents: 0 } },
  overdue: { count: 0, totalCents: 0 },
  totalCount: 0,
};
const meta = { page: 1, pageSize: 10, total: 0, totalPages: 1 };

const respond = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const ANA = { id: 1, email: "ana@example.com" };
const noSession = () => respond({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión" } }, 401);

/** Respuestas por defecto de la API simulada; `session` decide qué contesta /auth/me. */
function api(path: string, session: () => Promise<Response> = () => respond({ data: ANA })) {
  if (path.endsWith("/auth/me")) return session();
  if (path.endsWith("/stats/summary")) return respond({ data: summary });
  if (path.endsWith("/stats/monthly")) return respond({ data: [] });
  if (path.endsWith("/invoices")) return respond({ data: [], meta });
  return respond({ error: { code: "NOT_FOUND", message: "No existe" } }, 404);
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => api(new URL(url).pathname)));
});
afterEach(() => vi.unstubAllGlobals());

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, user: userEvent.setup() };
}

describe("router", () => {
  it("/ redirige al dashboard", async () => {
    const { router } = renderAt("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/dashboard");
  });

  it("carga de forma diferida la página de facturas", async () => {
    renderAt("/invoices");
    expect(await screen.findByText("Aún no hay facturas")).toBeInTheDocument();
  });

  it("carga la página de nueva factura", async () => {
    renderAt("/invoices/new");
    expect(await screen.findByRole("heading", { level: 1, name: "Nueva factura" })).toBeInTheDocument();
  });

  it("carga el detalle y la edición (404 del API → no encontrada)", async () => {
    renderAt("/invoices/5");
    expect(await screen.findByRole("heading", { name: "No encontramos esa página" })).toBeInTheDocument();
  });

  it("la edición con un 404 también muestra no encontrada", async () => {
    renderAt("/invoices/5/edit");
    expect(await screen.findByRole("heading", { name: "No encontramos esa página" })).toBeInTheDocument();
  });

  it("una ruta desconocida muestra no encontrada dentro del layout", async () => {
    renderAt("/no-existe");
    expect(await screen.findByRole("heading", { name: "No encontramos esa página" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toBeInTheDocument();
  });

  it("la navegación lateral lleva de una página a otra", async () => {
    const { user } = renderAt("/dashboard");
    await screen.findByRole("heading", { level: 1, name: "Dashboard" });

    await user.click(screen.getByRole("link", { name: "Facturas" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Facturas" })).toBeInTheDocument();
  });

  it("createAppRouter crea un router de navegador con las mismas rutas", () => {
    const router = createAppRouter();
    expect(router.routes).toHaveLength(routes.length);
    router.dispose();
  });
});

describe("router: sesión", () => {
  it("sin sesión, una ruta protegida redirige a /login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => api(new URL(url).pathname, noSession)));
    const { router } = renderAt("/invoices");
    expect(await screen.findByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.state).toEqual({ from: "/invoices" });
  });

  it("iniciar sesión vuelve a la ruta que se pedía", async () => {
    let signedIn = false;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        const path = new URL(url).pathname;
        if (path.endsWith("/auth/login")) {
          signedIn = true;
          return respond({ data: ANA });
        }
        return api(path, () => (signedIn ? respond({ data: ANA }) : noSession()));
      }),
    );
    const { router, user } = renderAt("/invoices");
    await screen.findByRole("heading", { level: 1, name: "Iniciar sesión" });

    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correct horse battery");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Facturas" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/invoices");
  });

  it("con sesión, /login lleva al dashboard", async () => {
    const { router } = renderAt("/login");
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/dashboard");
  });

  it("si no se puede comprobar la sesión, ofrece reintentar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderAt("/dashboard");
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("cerrar sesión devuelve a /login", async () => {
    let signedIn = true;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        const path = new URL(url).pathname;
        if (path.endsWith("/auth/logout")) {
          signedIn = false;
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return api(path, () => (signedIn ? respond({ data: ANA }) : noSession()));
      }),
    );
    const { router, user } = renderAt("/invoices");
    await screen.findByRole("heading", { level: 1, name: "Facturas" });
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });
});

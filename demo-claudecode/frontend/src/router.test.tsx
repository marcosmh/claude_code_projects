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

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/stats/summary")) return Promise.resolve(new Response(JSON.stringify({ data: summary })));
      if (path.endsWith("/stats/monthly")) return Promise.resolve(new Response(JSON.stringify({ data: [] })));
      if (path.endsWith("/invoices")) return Promise.resolve(new Response(JSON.stringify({ data: [], meta })));
      return Promise.resolve(new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "No existe" } }), { status: 404 }));
    }),
  );
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

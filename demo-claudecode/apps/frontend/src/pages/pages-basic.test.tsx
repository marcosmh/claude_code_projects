import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotFoundPage } from "./NotFoundPage";
import { parseId } from "./parseId";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

afterEach(() => vi.restoreAllMocks());

describe("parseId", () => {
  it.each([
    ["1", 1],
    ["42", 42],
  ])("acepta %s", (raw, expected) => expect(parseId(raw)).toBe(expected));

  it.each([undefined, "", "0", "-1", "1.5", "abc", "1e2x", "NaN"])("rechaza %s", (raw) => {
    expect(parseId(raw)).toBeNull();
  });
});

describe("NotFoundPage", () => {
  it("explica el error, fija el título y enlaza a la lista", () => {
    const router = createMemoryRouter([{ path: "*", element: <NotFoundPage /> }]);
    render(<RouterProvider router={router} />);

    expect(screen.getByRole("heading", { name: "No encontramos esa página" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a las facturas" })).toHaveAttribute("href", "/invoices");
    expect(document.title).toBe("No encontrada · Facturas");
  });
});

describe("RouteErrorBoundary", () => {
  function Boom(): never {
    throw new Error("boom");
  }

  it("un error de render muestra el estado de error y recarga al reintentar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    const router = createMemoryRouter([{ path: "/", element: <Boom />, errorElement: <RouteErrorBoundary /> }]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("una ruta inexistente (404 de router) muestra la página no encontrada", async () => {
    const router = createMemoryRouter([{ path: "/", element: <p>inicio</p>, errorElement: <RouteErrorBoundary /> }], {
      initialEntries: ["/nada"],
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "No encontramos esa página" })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "@/store/uiStore";
import { InvoiceFilterPanel } from "./InvoiceFilterPanel";

function Search() {
  return <output data-testid="search">{useLocation().search}</output>;
}

function setup(url = "/invoices") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <InvoiceFilterPanel />
      <Search />
    </MemoryRouter>,
  );
  return { user: userEvent.setup(), params: () => new URLSearchParams(screen.getByTestId("search").textContent ?? "") };
}

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ filtersCollapsed: false });
});

describe("InvoiceFilterPanel", () => {
  it("se pliega y se despliega con aria-expanded sin perder los filtros", async () => {
    const { user, params } = setup("/invoices?status=SENT");
    const toggle = screen.getByRole("button", { name: /Filtros/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("checkbox", { name: "Enviada" })).toBeVisible();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("checkbox", { name: "Enviada", hidden: true })).not.toBeVisible();
    expect(params().get("status")).toBe("SENT");
    expect(localStorage.getItem("filters")).toBe("collapsed");

    await user.click(toggle);
    expect(screen.getByRole("checkbox", { name: "Enviada" })).toBeVisible();
  });

  it("muestra cuántos grupos de filtros están activos", () => {
    setup("/invoices?status=SENT,PAID&from=2026-01-01");
    expect(screen.getByLabelText("2 activos")).toBeInTheDocument();
  });

  it("permite marcar varios estados", async () => {
    const { user, params } = setup();
    await user.click(screen.getByRole("checkbox", { name: "Pagada" }));
    await user.click(screen.getByRole("checkbox", { name: "Borrador" }));
    expect(params().get("status")).toBe("DRAFT,PAID");
    await user.click(screen.getByRole("checkbox", { name: "Pagada" }));
    expect(params().get("status")).toBe("DRAFT");
  });

  it("escribe el rango de fecha de emisión en la URL", async () => {
    const { user, params } = setup();
    await user.type(screen.getByLabelText("Desde"), "2026-01-01");
    await user.type(screen.getByLabelText("Hasta"), "2026-01-31");
    expect(params().get("from")).toBe("2026-01-01");
    expect(params().get("to")).toBe("2026-01-31");
  });

  it("no aplica una fecha final anterior a la inicial y explica el motivo", async () => {
    const { user, params } = setup("/invoices?from=2026-02-01");
    await user.type(screen.getByLabelText("Hasta"), "2026-01-01");
    expect(screen.getByText("La fecha final no puede ser anterior a la inicial")).toBeInTheDocument();
    expect(params().has("to")).toBe(false);
  });

  it("los importes están deshabilitados hasta elegir moneda", async () => {
    const { user } = setup();
    expect(screen.getByLabelText("Mínimo (con impuestos)")).toBeDisabled();
    expect(screen.getByText("Elige una moneda para filtrar por importe.")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Moneda"), "MXN");
    expect(screen.getByLabelText("Mínimo (con impuestos)")).toBeEnabled();
  });

  it("aplica el rango de importe al salir del campo o con Enter", async () => {
    const { user, params } = setup("/invoices?currency=USD");
    await user.type(screen.getByLabelText("Mínimo (con impuestos)"), "100");
    await user.tab();
    expect(params().get("min")).toBe("100");

    await user.type(screen.getByLabelText("Máximo (con impuestos)"), "250.50{Enter}");
    expect(params().get("max")).toBe("250.5");
  });

  it("rechaza un máximo menor que el mínimo", async () => {
    const { user, params } = setup("/invoices?currency=USD&min=500");
    await user.type(screen.getByLabelText("Máximo (con impuestos)"), "100");
    await user.tab();
    expect(screen.getByText("El máximo no puede ser menor que el mínimo")).toBeInTheDocument();
    expect(params().has("max")).toBe(false);
  });

  it("al quitar la moneda se quitan también los importes", async () => {
    const { user, params } = setup("/invoices?currency=EUR&min=10&max=20");
    await user.selectOptions(screen.getByLabelText("Moneda"), "");
    expect(params().has("currency")).toBe(false);
    expect(params().has("min")).toBe(false);
    expect(params().has("max")).toBe(false);
  });

  it("Quitar filtros limpia todo salvo la búsqueda y se deshabilita sin filtros", async () => {
    const { user, params } = setup("/invoices?q=acme&status=PAID&from=2026-01-01&currency=MXN&min=5");
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(screen.getByTestId("search").textContent).toBe("?q=acme");
    expect(params().get("q")).toBe("acme");
    expect(screen.getByRole("button", { name: "Quitar filtros" })).toBeDisabled();
  });
});

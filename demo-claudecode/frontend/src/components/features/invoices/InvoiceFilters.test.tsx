import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Status } from "@/types/invoice";
import { InvoiceFilters } from "./InvoiceFilters";

function setup(props: Partial<Parameters<typeof InvoiceFilters>[0]> = {}) {
  const onChange = vi.fn();
  const utils = render(<InvoiceFilters q="" status={undefined} counts={{}} onChange={onChange} {...props} />);
  return { onChange, ...utils, user: userEvent.setup() };
}

describe("InvoiceFilters", () => {
  it("marca la pestaña activa con aria-current", () => {
    setup({ status: "SENT" });
    expect(screen.getByRole("button", { name: "Enviada" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Todas" })).not.toHaveAttribute("aria-current");
  });

  it("sin estado la pestaña activa es Todas", () => {
    setup();
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-current", "true");
  });

  it("muestra contadores solo para las pestañas que tienen valor", () => {
    setup({ counts: { "": 9, DRAFT: 2 } });
    expect(screen.getByRole("button", { name: "Todas 9" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Borrador 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagada" })).toBeInTheDocument();
  });

  it.each([
    ["Todas", ""],
    ["Borrador", "DRAFT"],
    ["Enviada", "SENT"],
    ["Pagada", "PAID"],
  ] satisfies [string, Status | ""][])("al pulsar %s notifica el estado %j", async (label, value) => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: label }));
    expect(onChange).toHaveBeenCalledWith({ status: value });
  });

  it("envía la búsqueda al enviar el formulario con Enter", async () => {
    const { onChange, user } = setup();
    await user.type(screen.getByRole("searchbox", { name: "Buscar por número o cliente" }), "acme{Enter}");
    expect(onChange).toHaveBeenCalledWith({ q: "acme" });
  });

  it("envía la búsqueda con el botón Buscar", async () => {
    const { onChange, user } = setup();
    await user.type(screen.getByRole("searchbox"), "FAC-1");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(onChange).toHaveBeenCalledWith({ q: "FAC-1" });
  });

  it("empieza con el texto de la URL y lo alinea cuando la URL cambia desde fuera", () => {
    const { rerender, onChange } = setup({ q: "acme" });
    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("acme");

    rerender(<InvoiceFilters q="" status={undefined} counts={{}} onChange={onChange} />);

    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});

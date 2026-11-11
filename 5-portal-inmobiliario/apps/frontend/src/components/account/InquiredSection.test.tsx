// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserInquiryDto } from "@portal/shared-types";

const state = vi.hoisted(() => ({
  inquiries: undefined as UserInquiryDto[] | undefined,
  remove: vi.fn(),
  totalPages: 1,
  query: undefined as { page?: number; searchText?: string } | undefined,
}));
vi.mock("@/hooks/useUserInquiries", () => ({
  useUserInquiries: (query: { page?: number; searchText?: string }) => ({
    ...((state.query = query), {}),
    inquiries: state.inquiries,
    totalPages: state.totalPages,
    refresh: vi.fn(),
    remove: state.remove,
  }),
}));
vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => <span data-testid="thumbnail">{src}</span>,
}));

import { InquiredSection } from "./InquiredSection";

afterEach(() => {
  cleanup();
  state.inquiries = undefined;
  state.remove.mockReset();
  state.totalPages = 1;
});

const inquiry = (id: string, title: string): UserInquiryDto => ({
  id,
  propertyId: `p-${id}`,
  propertyTitle: title,
  propertyImageUrl: "https://img.example/casa.jpg",
  subject: `Nueva consulta: ${title}`,
  message: `Mensaje sobre ${title}`,
  createdAt: "2026-03-01T12:00:00.000Z",
});

describe("InquiredSection", () => {
  it("indica que carga mientras no hay datos", () => {
    render(<InquiredSection />);
    expect(screen.getByRole("heading", { level: 2, name: "Propiedades consultadas" })).toBeTruthy();
    expect(screen.getByText("Cargando tus consultas…")).toBeTruthy();
  });

  it("muestra el estado vacío con un enlace al catálogo", () => {
    state.inquiries = [];
    render(<InquiredSection />);
    expect(screen.getByText("Aún no has consultado ninguna propiedad.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar propiedades" }).getAttribute("href")).toBe(
      "/properties",
    );
  });

  it("lista cada consulta con foto, título, asunto y mensaje", () => {
    state.inquiries = [inquiry("1", "Casa en Coyoacán"), inquiry("2", "Depto en Polanco")];
    render(<InquiredSection />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 3, name: "Casa en Coyoacán" })).toBeTruthy();
    expect(screen.getByText("Nueva consulta: Casa en Coyoacán")).toBeTruthy();
    expect(screen.getByText("Mensaje sobre Casa en Coyoacán")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver Casa en Coyoacán" }).getAttribute("href")).toBe(
      "/properties/p-1",
    );
    expect(screen.getAllByTestId("thumbnail")).toHaveLength(2);
  });

  const openDialog = () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Eliminar consulta sobre Casa en Coyoacán" }),
    );

  it("elimina la consulta solo tras pulsar «Sí, eliminar» en el modal", async () => {
    state.inquiries = [inquiry("1", "Casa en Coyoacán")];
    state.remove.mockResolvedValue(undefined);
    render(<InquiredSection />);

    openDialog();
    expect(state.remove).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog").textContent).toContain("Casa en Coyoacán");

    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith("1"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("no elimina si la persona pulsa «No, cancelar»", () => {
    state.inquiries = [inquiry("1", "Casa en Coyoacán")];
    render(<InquiredSection />);

    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "No, cancelar" }));
    expect(state.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("avisa si la API falla al eliminar", async () => {
    state.inquiries = [inquiry("1", "Casa en Coyoacán")];
    state.remove.mockRejectedValue(new Error("falló"));
    render(<InquiredSection />);

    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No se pudo eliminar");
  });

  it("pide la búsqueda al backend tras escribir y vuelve a la página 1", async () => {
    state.inquiries = [inquiry("1", "Casa en Coyoacán")];
    render(<InquiredSection />);

    fireEvent.change(screen.getByLabelText("Buscar en tus consultas por título o mensaje"), {
      target: { value: "  coyoacán " },
    });
    await waitFor(() => expect(state.query).toEqual({ page: 1, searchText: "coyoacán" }));
  });

  it("indica cuando la búsqueda no encuentra consultas", async () => {
    state.inquiries = [];
    render(<InquiredSection />);
    fireEvent.change(screen.getByLabelText("Buscar en tus consultas por título o mensaje"), {
      target: { value: "xyz" },
    });
    expect(await screen.findByText("No hay consultas que coincidan con «xyz».")).toBeTruthy();
  });

  it("pagina: avanza y retrocede entre páginas", () => {
    state.inquiries = [inquiry("1", "Casa en Coyoacán")];
    state.totalPages = 3;
    render(<InquiredSection />);

    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
    expect((screen.getByRole("button", { name: "← Anterior" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();
    expect(state.query).toMatchObject({ page: 2 });
  });
});

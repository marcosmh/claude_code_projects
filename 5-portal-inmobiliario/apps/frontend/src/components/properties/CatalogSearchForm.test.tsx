// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogSearchForm } from "./CatalogSearchForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe("CatalogSearchForm", () => {
  it("refleja la búsqueda en la URL y vuelve a la primera página", async () => {
    render(<CatalogSearchForm />);
    await userEvent.setup().type(screen.getByLabelText("Buscar"), "  Mérida ");
    await userEvent.setup().click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/properties?search=M%C3%A9rida"));
  });

  it("precarga los valores actuales y conserva la operación", async () => {
    render(<CatalogSearchForm search="tulum" operation="RENT" />);
    expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("tulum");
    await userEvent.setup().click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/properties?search=tulum&operation=RENT"),
    );
  });

  it("limpia la búsqueda al enviar vacío", async () => {
    render(<CatalogSearchForm search="tulum" />);
    await userEvent.setup().clear(screen.getByLabelText("Buscar"));
    await userEvent.setup().click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/properties"));
  });

  it("rechaza textos de más de 100 caracteres", async () => {
    render(<CatalogSearchForm search={"a".repeat(101)} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});

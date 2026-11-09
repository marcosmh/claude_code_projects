// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogSearchBar } from "./CatalogSearchBar";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe("CatalogSearchBar", () => {
  it("refleja la búsqueda en la URL conservando filtros y orden, y vuelve a la página 1", async () => {
    const user = userEvent.setup();
    render(<CatalogSearchBar filters={{ operation: ["SALE", "RENT"], sort: "price_asc" }} />);
    await user.type(screen.getByLabelText("Buscar"), "  Mérida ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/properties?search=M%C3%A9rida&operation=SALE%2CRENT&sort=price_asc",
      ),
    );
  });

  it("precarga la búsqueda actual y la quita al enviar vacío", async () => {
    const user = userEvent.setup();
    render(<CatalogSearchBar filters={{ search: "tulum", operation: ["RENT"] }} />);
    expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("tulum");
    await user.clear(screen.getByLabelText("Buscar"));
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/properties?operation=RENT"));
  });

  it("rechaza textos de más de 100 caracteres", async () => {
    render(<CatalogSearchBar filters={{ search: "a".repeat(101) }} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});

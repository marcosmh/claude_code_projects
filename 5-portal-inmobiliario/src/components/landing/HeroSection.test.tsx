// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroSection } from "./HeroSection";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

afterEach(() => {
  cleanup();
  pushMock.mockClear();
});

describe("HeroSection", () => {
  it("muestra el título principal y un buscador con labels", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByRole("search")).toBeTruthy();
    expect(screen.getByLabelText("¿Dónde quieres vivir?")).toBeTruthy();
    expect(screen.getByLabelText("Operación")).toBeTruthy();
  });

  it("navega al catálogo con la búsqueda y la operación en la URL", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.type(screen.getByLabelText("¿Dónde quieres vivir?"), "polanco");
    await user.selectOptions(screen.getByLabelText("Operación"), "SALE");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(pushMock).toHaveBeenCalledWith("/properties?search=polanco&operation=SALE");
  });

  it("navega al catálogo completo si no se escribe nada", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(pushMock).toHaveBeenCalledWith("/properties");
  });

  it("no navega y muestra error si el texto es demasiado largo", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);
    await user.type(screen.getByLabelText("¿Dónde quieres vivir?"), "a".repeat(101));
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(pushMock).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toContain("Máximo 100");
  });
});

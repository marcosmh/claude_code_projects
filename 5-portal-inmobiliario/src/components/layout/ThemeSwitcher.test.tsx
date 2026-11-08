// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { useThemeStore } from "@/stores/themeStore";
import { ThemeSwitcher } from "./ThemeSwitcher";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  useThemeStore.setState({ theme: "default" });
});

afterEach(cleanup);

describe("ThemeSwitcher", () => {
  it("es un grupo accesible con tres opciones: Actual, Smallville y Claro", () => {
    render(<ThemeSwitcher />);

    expect(screen.getByRole("group", { name: "Tema de color" })).toBeTruthy();
    const options = screen.getAllByRole("radio");
    expect(options.map((option) => (option as HTMLInputElement).value)).toEqual([
      "default",
      "smallville",
      "light",
    ]);
    expect(screen.getByLabelText("Actual")).toBeTruthy();
    expect(screen.getByLabelText("Smallville")).toBeTruthy();
    expect(screen.getByLabelText("Claro")).toBeTruthy();
  });

  it("marca el tema Actual por defecto", () => {
    render(<ThemeSwitcher />);
    expect((screen.getByLabelText("Actual") as HTMLInputElement).checked).toBe(true);
  });

  it("al elegir Smallville aplica el tema al documento y lo recuerda", async () => {
    render(<ThemeSwitcher />);
    await userEvent.setup().click(screen.getByLabelText("Smallville"));

    expect(document.documentElement.dataset.theme).toBe("smallville");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("smallville");
    expect((screen.getByLabelText("Smallville") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Actual") as HTMLInputElement).checked).toBe(false);
  });

  it("permite volver al tema Actual y cambiar a Claro", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByLabelText("Claro"));
    expect(document.documentElement.dataset.theme).toBe("light");
    await user.click(screen.getByLabelText("Actual"));
    expect(document.documentElement.dataset.theme).toBe("default");
  });

  it("refleja el tema que dejó el script inicial al montar", () => {
    document.documentElement.dataset.theme = "smallville";
    render(<ThemeSwitcher />);
    expect((screen.getByLabelText("Smallville") as HTMLInputElement).checked).toBe(true);
  });

  it("se puede operar con teclado (radio nativo)", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(document.documentElement.dataset.theme).toBe("smallville");
  });

  it("dos instancias (escritorio y móvil) se mantienen sincronizadas", async () => {
    render(
      <>
        <ThemeSwitcher />
        <ThemeSwitcher showLabels />
      </>,
    );
    await userEvent.setup().click(screen.getAllByLabelText("Smallville")[1]);
    for (const radio of screen.getAllByLabelText("Smallville")) {
      expect((radio as HTMLInputElement).checked).toBe(true);
    }
  });
});

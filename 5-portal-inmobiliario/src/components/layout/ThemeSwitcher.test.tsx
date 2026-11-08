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
  useThemeStore.setState({ theme: "light" });
});

afterEach(cleanup);

const getTrigger = () => screen.getByRole("button", { name: /^Tema de color:/ });

describe("ThemeSwitcher (desplegable)", () => {
  it("muestra un botón cerrado con el tema actual y sin la lista", () => {
    render(<ThemeSwitcher />);

    const trigger = getTrigger();
    expect(trigger.getAttribute("aria-label")).toBe("Tema de color: Claro");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("al hacer clic abre la lista con Claro, Oscuro y Smallville, en ese orden", async () => {
    render(<ThemeSwitcher />);
    await userEvent.setup().click(getTrigger());

    expect(getTrigger().getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu", { name: "Tema de color" })).toBeTruthy();
    expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
      "Claro",
      "Oscuro",
      "Smallville",
    ]);
  });

  it("marca como activa la opción del tema actual", async () => {
    render(<ThemeSwitcher />);
    await userEvent.setup().click(getTrigger());

    expect(screen.getByRole("menuitemradio", { name: "Claro" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("menuitemradio", { name: "Oscuro" }).getAttribute("aria-checked")).toBe("false");
  });

  it("al elegir una opción aplica el tema, lo recuerda, cierra la lista y actualiza el botón", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(getTrigger());
    await user.click(screen.getByRole("menuitemradio", { name: "Smallville" }));

    expect(document.documentElement.dataset.theme).toBe("smallville");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("smallville");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(getTrigger().getAttribute("aria-label")).toBe("Tema de color: Smallville");
    expect(document.activeElement).toBe(getTrigger());
  });

  it("permite cambiar a Oscuro y volver a Claro", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(getTrigger());
    await user.click(screen.getByRole("menuitemradio", { name: "Oscuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getTrigger().getAttribute("aria-label")).toBe("Tema de color: Oscuro");

    await user.click(getTrigger());
    await user.click(screen.getByRole("menuitemradio", { name: "Claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("refleja el tema que dejó el script inicial al montar", () => {
    document.documentElement.dataset.theme = "smallville";
    render(<ThemeSwitcher />);
    expect(getTrigger().getAttribute("aria-label")).toBe("Tema de color: Smallville");
  });

  it("con teclado: Enter abre, las flechas navegan y Enter selecciona", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Claro" }));

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Oscuro" }));

    await user.keyboard("{Enter}");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("la flecha abajo en el botón abre la lista y la navegación es circular", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menu")).toBeTruthy();

    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Smallville" }));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Claro" }));
  });

  it("Home y End saltan a la primera y última opción", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);
    await user.click(getTrigger());

    await user.keyboard("{End}");
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Smallville" }));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: "Claro" }));
  });

  it("Escape cierra la lista sin cambiar el tema y devuelve el foco al botón", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);
    await user.click(getTrigger());

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(getTrigger());
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("un clic fuera cierra la lista sin cambiar el tema", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemeSwitcher />
        <p>Contenido de la página</p>
      </>,
    );
    await user.click(getTrigger());

    await user.click(screen.getByText("Contenido de la página"));

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("clic en el botón con la lista abierta la cierra", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);
    await user.click(getTrigger());
    await user.click(getTrigger());
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("dos instancias (escritorio y móvil) se mantienen sincronizadas", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemeSwitcher />
        <ThemeSwitcher showLabels align="left" />
      </>,
    );

    await user.click(screen.getAllByRole("button", { name: /^Tema de color:/ })[1]);
    await user.click(screen.getByRole("menuitemradio", { name: "Smallville" }));

    for (const trigger of screen.getAllByRole("button", { name: /^Tema de color:/ })) {
      expect(trigger.getAttribute("aria-label")).toBe("Tema de color: Smallville");
    }
  });
});

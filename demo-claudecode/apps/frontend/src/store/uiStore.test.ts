import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "./uiStore";

const html = document.documentElement;

beforeEach(() => {
  html.classList.remove("dark", "menu-collapsed");
  localStorage.clear();
  useUiStore.setState({ theme: "light", menuCollapsed: false, filtersCollapsed: false });
});
afterEach(() => vi.restoreAllMocks());

describe("uiStore", () => {
  it("toggleTheme alterna la clase dark en <html>, el estado y localStorage", () => {
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("dark");
    expect(html).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("light");
    expect(html).not.toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("toggleFilters alterna el estado y persiste la preferencia", () => {
    useUiStore.getState().toggleFilters();
    expect(useUiStore.getState().filtersCollapsed).toBe(true);
    expect(localStorage.getItem("filters")).toBe("collapsed");
    useUiStore.getState().toggleFilters();
    expect(useUiStore.getState().filtersCollapsed).toBe(false);
    expect(localStorage.getItem("filters")).toBe("open");
  });

  it("toggleMenu alterna la clase menu-collapsed y persiste la preferencia", () => {
    useUiStore.getState().toggleMenu();
    expect(useUiStore.getState().menuCollapsed).toBe(true);
    expect(html).toHaveClass("menu-collapsed");
    expect(localStorage.getItem("menu")).toBe("collapsed");

    useUiStore.getState().toggleMenu();
    expect(useUiStore.getState().menuCollapsed).toBe(false);
    expect(html).not.toHaveClass("menu-collapsed");
    expect(localStorage.getItem("menu")).toBe("open");
  });

  it("sigue funcionando en la sesión si localStorage no está disponible", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("cuota", "QuotaExceededError");
    });

    expect(() => useUiStore.getState().toggleTheme()).not.toThrow();
    expect(useUiStore.getState().theme).toBe("dark");
  });

  it("el estado inicial refleja las clases que puso el script de index.html", async () => {
    html.classList.add("dark", "menu-collapsed");
    vi.resetModules();
    const { useUiStore: fresh } = await import("./uiStore");
    expect(fresh.getState()).toMatchObject({ theme: "dark", menuCollapsed: true });
  });
});

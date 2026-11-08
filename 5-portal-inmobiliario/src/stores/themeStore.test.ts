// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { useThemeStore } from "./themeStore";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  useThemeStore.setState({ theme: "light" });
});

afterEach(() => vi.restoreAllMocks());

describe("useThemeStore", () => {
  it("empieza con el tema Claro", () => {
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("setTheme actualiza el estado, el documento y el almacenamiento", () => {
    useThemeStore.getState().setTheme("smallville");

    expect(useThemeStore.getState().theme).toBe("smallville");
    expect(document.documentElement.dataset.theme).toBe("smallville");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("smallville");
  });

  it("setTheme funciona aunque localStorage falle", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cuota excedida");
    });

    expect(() => useThemeStore.getState().setTheme("light")).not.toThrow();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("syncFromDocument toma el tema que dejó el script inicial", () => {
    document.documentElement.dataset.theme = "smallville";
    useThemeStore.getState().syncFromDocument();
    expect(useThemeStore.getState().theme).toBe("smallville");
  });

  it("syncFromDocument ignora valores inválidos o ausentes", () => {
    document.documentElement.dataset.theme = "inventado";
    useThemeStore.setState({ theme: "dark" });
    useThemeStore.getState().syncFromDocument();
    expect(useThemeStore.getState().theme).toBe("light");

    delete document.documentElement.dataset.theme;
    useThemeStore.setState({ theme: "smallville" });
    useThemeStore.getState().syncFromDocument();
    expect(useThemeStore.getState().theme).toBe("light");
  });
});

import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  isThemeName,
  readStoredTheme,
  THEME_INIT_SCRIPT,
  THEME_NAMES,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from "./theme";

describe("isThemeName", () => {
  it("acepta los temas definidos", () => {
    for (const name of THEME_NAMES) expect(isThemeName(name)).toBe(true);
  });

  it.each(["", "dark", "SMALLVILLE", null, undefined, 3])("rechaza %j", (value) => {
    expect(isThemeName(value)).toBe(false);
  });
});

describe("readStoredTheme", () => {
  it("devuelve el tema guardado", () => {
    expect(readStoredTheme({ getItem: () => "smallville" })).toBe("smallville");
  });

  it("vuelve al tema por defecto con valores inválidos, vacíos o sin almacenamiento", () => {
    expect(readStoredTheme({ getItem: () => "otro" })).toBe(DEFAULT_THEME);
    expect(readStoredTheme({ getItem: () => null })).toBe(DEFAULT_THEME);
    expect(readStoredTheme(undefined)).toBe(DEFAULT_THEME);
  });

  it("no falla si el almacenamiento lanza una excepción", () => {
    expect(
      readStoredTheme({
        getItem: () => {
          throw new Error("bloqueado");
        },
      }),
    ).toBe(DEFAULT_THEME);
  });
});

describe("THEME_OPTIONS", () => {
  it("ofrece Actual, Smallville y Claro, una opción por tema", () => {
    expect(THEME_OPTIONS.map((option) => option.label)).toEqual(["Actual", "Smallville", "Claro"]);
    expect(new Set(THEME_OPTIONS.map((option) => option.name))).toEqual(new Set(THEME_NAMES));
  });
});

describe("THEME_INIT_SCRIPT", () => {
  const runScript = (storedValue: string | null, shouldThrow = false) => {
    const documentElement = { dataset: {} as Record<string, string> };
    const localStorage = {
      getItem: (key: string) => {
        if (shouldThrow) throw new Error("bloqueado");
        return key === THEME_STORAGE_KEY ? storedValue : null;
      },
    };
    new Function("document", "localStorage", THEME_INIT_SCRIPT)({ documentElement }, localStorage);
    return documentElement.dataset.theme;
  };

  it("aplica el tema guardado al documento", () => {
    expect(runScript("smallville")).toBe("smallville");
    expect(runScript("light")).toBe("light");
    expect(runScript("default")).toBe("default");
  });

  it("ignora valores desconocidos o ausentes", () => {
    expect(runScript("hacker")).toBeUndefined();
    expect(runScript(null)).toBeUndefined();
  });

  it("no rompe la página si el almacenamiento falla", () => {
    expect(runScript(null, true)).toBeUndefined();
  });
});

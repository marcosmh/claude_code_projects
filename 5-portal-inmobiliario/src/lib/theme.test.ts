import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  isThemeName,
  resolveTheme,
  THEME_INIT_SCRIPT,
  THEME_NAMES,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
} from "./theme";

describe("isThemeName", () => {
  it("acepta los temas definidos", () => {
    for (const name of THEME_NAMES) expect(isThemeName(name)).toBe(true);
  });

  it.each(["", "default", "SMALLVILLE", "Dark", null, undefined, 3])("rechaza %j", (value) => {
    expect(isThemeName(value)).toBe(false);
  });
});

describe("resolveTheme", () => {
  it("respeta el tema guardado aunque el sistema prefiera otro", () => {
    expect(resolveTheme("smallville", true)).toBe("smallville");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("sin tema guardado usa la preferencia del sistema", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme(undefined, true)).toBe("dark");
  });

  it("trata valores inválidos (incluido el antiguo 'default') como no guardados", () => {
    expect(resolveTheme("default", true)).toBe("dark");
    expect(resolveTheme("default", false)).toBe("light");
    expect(resolveTheme("hacker", false)).toBe("light");
  });

  it("el tema inicial del servidor es Claro", () => {
    expect(DEFAULT_THEME).toBe("light");
  });
});

describe("THEME_OPTIONS", () => {
  it("ofrece Claro, Oscuro y Smallville, en ese orden", () => {
    expect(THEME_OPTIONS.map((option) => option.label)).toEqual(["Claro", "Oscuro", "Smallville"]);
    expect(THEME_OPTIONS.map((option) => option.name)).toEqual(["light", "dark", "smallville"]);
    expect(new Set(THEME_OPTIONS.map((option) => option.name))).toEqual(new Set(THEME_NAMES));
  });
});

describe("THEME_INIT_SCRIPT", () => {
  const runScript = ({
    storedValue = null,
    prefersDark = false,
    storageThrows = false,
    hasMatchMedia = true,
  }: {
    storedValue?: string | null;
    prefersDark?: boolean;
    storageThrows?: boolean;
    hasMatchMedia?: boolean;
  }) => {
    const documentElement = { dataset: {} as Record<string, string> };
    const localStorage = {
      getItem: (key: string) => {
        if (storageThrows) throw new Error("bloqueado");
        return key === THEME_STORAGE_KEY ? storedValue : null;
      },
    };
    const window = hasMatchMedia ? { matchMedia: () => ({ matches: prefersDark }) } : {};
    new Function("document", "localStorage", "window", THEME_INIT_SCRIPT)(
      { documentElement },
      localStorage,
      window,
    );
    return documentElement.dataset.theme;
  };

  it("aplica el tema guardado, sin importar el sistema", () => {
    expect(runScript({ storedValue: "smallville", prefersDark: false })).toBe("smallville");
    expect(runScript({ storedValue: "light", prefersDark: true })).toBe("light");
    expect(runScript({ storedValue: "dark", prefersDark: false })).toBe("dark");
  });

  it("sin tema guardado sigue la preferencia del sistema", () => {
    expect(runScript({ prefersDark: true })).toBe("dark");
    expect(runScript({ prefersDark: false })).toBe("light");
  });

  it("ignora valores guardados inválidos, como el antiguo 'default'", () => {
    expect(runScript({ storedValue: "default", prefersDark: true })).toBe("dark");
    expect(runScript({ storedValue: "hacker", prefersDark: false })).toBe("light");
  });

  it("si el almacenamiento falla usa la preferencia del sistema", () => {
    expect(runScript({ storageThrows: true, prefersDark: true })).toBe("dark");
  });

  it("sin matchMedia cae en Claro", () => {
    expect(runScript({ hasMatchMedia: false })).toBe("light");
  });
});

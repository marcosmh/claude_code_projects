export const THEME_STORAGE_KEY = "portal-theme";

export const THEME_NAMES = ["default", "light", "smallville"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export const DEFAULT_THEME: ThemeName = "default";

export type ThemeOption = {
  name: ThemeName;
  label: string;
  /** Fondo CSS de la muestra de color del selector. */
  swatch: string;
};

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { name: "default", label: "Actual", swatch: "linear-gradient(135deg, #ffffff 50%, #0a0a0a 50%)" },
  { name: "smallville", label: "Smallville", swatch: "linear-gradient(135deg, #d7263d 50%, #2f6fed 50%)" },
  { name: "light", label: "Claro", swatch: "#ffffff" },
];

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && (THEME_NAMES as readonly string[]).includes(value);
}

/** Lee el tema guardado; ante cualquier fallo o valor inválido devuelve el tema por defecto. */
export function readStoredTheme(storage: Pick<Storage, "getItem"> | undefined): ThemeName {
  try {
    const storedValue = storage?.getItem(THEME_STORAGE_KEY);
    return isThemeName(storedValue) ? storedValue : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Script que se ejecuta en <head> antes del primer pintado para aplicar el tema
 * guardado y evitar el parpadeo. Debe mantenerse sincronizado con THEME_NAMES.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${THEME_NAMES.map((name) => `t===${JSON.stringify(name)}`).join("||")}){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

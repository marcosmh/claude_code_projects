export const THEME_STORAGE_KEY = "portal-theme";

export const THEME_NAMES = ["light", "dark", "smallville"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

/** Tema inicial en el servidor, antes de conocer la preferencia del sistema o la elección guardada. */
export const DEFAULT_THEME: ThemeName = "light";

export type ThemeOption = {
  name: ThemeName;
  label: string;
  /** Fondo CSS de la muestra de color del selector. */
  swatch: string;
};

/** Orden en que se muestran en el selector. */
export const THEME_OPTIONS: readonly ThemeOption[] = [
  { name: "light", label: "Claro", swatch: "#ffffff" },
  { name: "dark", label: "Oscuro", swatch: "#0a0a0a" },
  { name: "smallville", label: "Smallville", swatch: "linear-gradient(135deg, #d7263d 50%, #2f6fed 50%)" },
];

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && (THEME_NAMES as readonly string[]).includes(value);
}

/**
 * Tema a aplicar: el guardado si es válido; si no, Oscuro o Claro según la
 * preferencia del sistema (primera visita o valor guardado inválido).
 */
export function resolveTheme(storedValue: unknown, prefersDark: boolean): ThemeName {
  if (isThemeName(storedValue)) return storedValue;
  return prefersDark ? "dark" : "light";
}

/**
 * Script que se ejecuta en <head> antes del primer pintado para aplicar el tema y
 * evitar el parpadeo. Replica resolveTheme y debe mantenerse sincronizado con THEME_NAMES.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=null;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch(e){}if(!(${THEME_NAMES.map((name) => `t===${JSON.stringify(name)}`).join("||")})){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

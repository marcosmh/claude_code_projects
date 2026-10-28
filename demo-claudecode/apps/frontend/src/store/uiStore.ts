import { create } from "zustand";

type Theme = "dark" | "light";

interface UiState {
  theme: Theme;
  menuCollapsed: boolean;
  /** Sección de filtros de la barra lateral (plegada solo oculta el contenido; los filtros siguen aplicados). */
  filtersCollapsed: boolean;
  toggleTheme: () => void;
  toggleMenu: () => void;
  toggleFilters: () => void;
}

const root = () => document.documentElement;

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Almacenamiento no disponible: el cambio sigue valiendo para esta sesión.
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Estado de UI global. La clase en <html> la fija antes del primer pintado el script de index.html. */
export const useUiStore = create<UiState>((set, get) => ({
  theme: root().classList.contains("dark") ? "dark" : "light",
  menuCollapsed: root().classList.contains("menu-collapsed"),
  filtersCollapsed: read("filters") === "collapsed",

  toggleTheme: () => {
    const theme: Theme = get().theme === "dark" ? "light" : "dark";
    root().classList.toggle("dark", theme === "dark");
    persist("theme", theme);
    set({ theme });
  },

  toggleMenu: () => {
    const menuCollapsed = !get().menuCollapsed;
    root().classList.toggle("menu-collapsed", menuCollapsed);
    persist("menu", menuCollapsed ? "collapsed" : "open");
    set({ menuCollapsed });
  },

  toggleFilters: () => {
    const filtersCollapsed = !get().filtersCollapsed;
    persist("filters", filtersCollapsed ? "collapsed" : "open");
    set({ filtersCollapsed });
  },
}));

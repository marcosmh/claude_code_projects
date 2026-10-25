import { create } from "zustand";

type Theme = "dark" | "light";

interface UiState {
  theme: Theme;
  menuCollapsed: boolean;
  toggleTheme: () => void;
  toggleMenu: () => void;
}

const root = () => document.documentElement;

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Almacenamiento no disponible: el cambio sigue valiendo para esta sesión.
  }
}

/** Estado de UI global. La clase en <html> la fija antes del primer pintado el script de index.html. */
export const useUiStore = create<UiState>((set, get) => ({
  theme: root().classList.contains("dark") ? "dark" : "light",
  menuCollapsed: root().classList.contains("menu-collapsed"),

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
}));

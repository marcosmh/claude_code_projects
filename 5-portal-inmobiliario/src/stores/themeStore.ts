"use client";

import { create } from "zustand";
import {
  DEFAULT_THEME,
  isThemeName,
  THEME_STORAGE_KEY,
  type ThemeName,
} from "@/lib/theme";

type ThemeStore = {
  theme: ThemeName;
  /** Cambia el tema, lo aplica al documento y lo recuerda. */
  setTheme: (theme: ThemeName) => void;
  /** Sincroniza el estado con el tema que el script inicial dejó en el documento. */
  syncFromDocument: () => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: DEFAULT_THEME,

  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Almacenamiento no disponible (modo privado): el tema solo dura la sesión.
    }
    set({ theme });
  },

  syncFromDocument: () => {
    const appliedTheme = document.documentElement.dataset.theme;
    set({ theme: isThemeName(appliedTheme) ? appliedTheme : DEFAULT_THEME });
  },
}));

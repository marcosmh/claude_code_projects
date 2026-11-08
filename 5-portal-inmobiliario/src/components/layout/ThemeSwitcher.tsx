"use client";

import { useEffect, useId } from "react";
import { cn } from "@/lib/cn";
import { THEME_OPTIONS } from "@/lib/theme";
import { useThemeStore } from "@/stores/themeStore";

type ThemeSwitcherProps = {
  /** Muestra siempre el texto de cada opción (menú móvil). */
  showLabels?: boolean;
  className?: string;
};

export function ThemeSwitcher({ showLabels = false, className }: ThemeSwitcherProps) {
  const groupName = useId();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const syncFromDocument = useThemeStore((state) => state.syncFromDocument);

  useEffect(() => {
    syncFromDocument();
  }, [syncFromDocument]);

  return (
    <fieldset className={cn("flex items-center gap-1", className)}>
      <legend className="sr-only">Tema de color</legend>
      {THEME_OPTIONS.map((option) => (
        <label key={option.name} className="relative cursor-pointer">
          <input
            type="radio"
            name={groupName}
            value={option.name}
            checked={theme === option.name}
            onChange={() => setTheme(option.name)}
            className="peer sr-only"
          />
          <span
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-foreground/5",
              "peer-checked:bg-foreground/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
            )}
          >
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 rounded-full border border-foreground/30"
              style={{ background: option.swatch }}
            />
            <span className={showLabels ? undefined : "sr-only lg:not-sr-only"}>{option.label}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

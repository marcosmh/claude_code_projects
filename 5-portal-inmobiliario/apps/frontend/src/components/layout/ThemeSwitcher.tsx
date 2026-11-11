"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { THEME_OPTIONS, type ThemeName } from "@/lib/theme";
import { useThemeStore } from "@/stores/themeStore";

type ThemeSwitcherProps = {
  /** Muestra siempre el nombre del tema en el botón (menú móvil). */
  showLabels?: boolean;
  /** Lado del botón al que se alinea la lista desplegable. */
  align?: "left" | "right";
  className?: string;
};

const focusRingClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function ThemeSwatch({ background }: { background: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-full border border-foreground/30"
      style={{ background }}
    />
  );
}

export function ThemeSwitcher({
  showLabels = false,
  align = "right",
  className,
}: ThemeSwitcherProps) {
  const menuId = useId();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const syncFromDocument = useThemeStore((state) => state.syncFromDocument);

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentOption =
    THEME_OPTIONS.find((option) => option.name === theme) ?? THEME_OPTIONS[0];

  useEffect(() => {
    syncFromDocument();
  }, [syncFromDocument]);

  // Al abrir, el foco pasa a la opción activa (sincroniza con el DOM).
  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = THEME_OPTIONS.findIndex((option) => option.name === theme);
    itemRefs.current[Math.max(selectedIndex, 0)]?.focus();
    // Solo al abrir: cambiar de tema cierra la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cierra al hacer clic fuera del componente.
  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  const closeAndFocusTrigger = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const selectTheme = (themeName: ThemeName) => {
    setTheme(themeName);
    closeAndFocusTrigger();
  };

  const moveFocus = (currentIndex: number, step: number) => {
    const nextIndex = (currentIndex + step + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    itemRefs.current[nextIndex]?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const focusedIndex = itemRefs.current.findIndex((item) => item === document.activeElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveFocus(focusedIndex, 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(focusedIndex, -1);
        break;
      case "Home":
        event.preventDefault();
        itemRefs.current[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        itemRefs.current[THEME_OPTIONS.length - 1]?.focus();
        break;
      case "Escape":
        event.preventDefault();
        closeAndFocusTrigger();
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={`Tema de color: ${currentOption.label}`}
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex items-center gap-2 rounded-md border border-foreground/15 px-3 py-2 text-sm font-medium transition-colors hover:bg-foreground/5",
          focusRingClassName,
        )}
      >
        <ThemeSwatch background={currentOption.swatch} />
        <span className={showLabels ? undefined : "sr-only xl:not-sr-only"}>
          {currentOption.label}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Tema de color"
          onKeyDown={handleMenuKeyDown}
          className={cn(
            "absolute z-50 mt-2 w-52 rounded-lg border border-foreground/15 bg-surface p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = option.name === theme;
            return (
              <button
                key={option.name}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                tabIndex={-1}
                onClick={() => selectTheme(option.name)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-foreground/5",
                  isSelected && "bg-foreground/10",
                  focusRingClassName,
                )}
              >
                <ThemeSwatch background={option.swatch} />
                <span className="flex-1">{option.label}</span>
                {isSelected && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

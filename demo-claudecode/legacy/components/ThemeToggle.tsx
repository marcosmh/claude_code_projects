"use client";

import { useHtmlClass } from "@/hooks/useHtmlClass";

export function ThemeToggle() {
  const [dark, toggle] = useHtmlClass("dark", "theme", { on: "dark", off: "light" });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Tema oscuro"
      onClick={toggle}
      className="relative inline-flex h-7 w-14 items-center rounded-full bg-zinc-200 px-1 text-xs transition-colors"
    >
      <span aria-hidden className="absolute left-1.5">☀️</span>
      <span aria-hidden className="absolute right-1.5">🌙</span>
      <span
        aria-hidden
        className={`z-10 h-5 w-5 rounded-full bg-white shadow transition-transform ${dark ? "translate-x-7" : ""}`}
      />
    </button>
  );
}

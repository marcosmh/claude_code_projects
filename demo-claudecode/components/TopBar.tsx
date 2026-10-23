"use client";

import { useHtmlClass } from "@/hooks/useHtmlClass";

export function TopBar() {
  const [collapsed, toggle] = useHtmlClass("menu-collapsed", "menu", { on: "collapsed", off: "open" });

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-4">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-controls="main-menu"
        aria-label={collapsed ? "Mostrar menú" : "Ocultar menú"}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-200"
      >
        <span aria-hidden>☰</span>
      </button>
      <span className="text-sm font-medium">Facturas</span>
    </header>
  );
}

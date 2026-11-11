"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";

const COLLAPSED_STORAGE_KEY = "admin-sidebar-collapsed";

// Preferencia del menú: vive en localStorage (con respaldo en memoria si no está disponible).
// useSyncExternalStore da `false` en el servidor y al hidratar, así no hay desajuste.
let collapsedInMemory = false;
const collapsedListeners = new Set<() => void>();

function subscribeToCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  return () => {
    collapsedListeners.delete(listener);
  };
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return collapsedInMemory;
  }
}

function writeCollapsed(value: boolean) {
  collapsedInMemory = value;
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(value));
  } catch {
    // No se pudo recordar la preferencia; no es crítico.
  }
  collapsedListeners.forEach((listener) => listener());
}

/**
 * Estructura del área de administración (spec §38): barra lateral colapsable, barra superior y
 * contenido. Es independiente del header y el pie del portal.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isCollapsed = useSyncExternalStore(subscribeToCollapsed, readCollapsed, () => false);
  // El panel móvil queda abierto solo en la ruta donde se abrió: al navegar se cierra.
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
  const isMobileOpen = mobileOpenPath === pathname;
  const closeMobileMenu = () => setMobileOpenPath(null);

  useEffect(() => {
    if (!isMobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpenPath(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isMobileOpen]);

  return (
    <div className="admin-area flex min-h-screen bg-background text-foreground">
      <AdminSidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onNavigate={closeMobileMenu}
      />
      {isMobileOpen && (
        <div
          aria-hidden="true"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-30 bg-slate-900/60 lg:hidden"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar
          isCollapsed={isCollapsed}
          onToggleCollapsed={() => writeCollapsed(!isCollapsed)}
          isMobileMenuOpen={isMobileOpen}
          onOpenMobileMenu={() => setMobileOpenPath(pathname)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 focus:outline-none sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

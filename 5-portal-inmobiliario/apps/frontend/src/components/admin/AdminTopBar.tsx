"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@portal/api-client";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFlash } from "@/hooks/useFlash";

type AdminTopBarProps = {
  /** Solo escritorio: la barra lateral muestra únicamente los iconos. */
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  isMobileMenuOpen: boolean;
  onOpenMobileMenu: () => void;
};

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Barra superior: botón del menú en móvil, nombre de la persona y cierre de sesión. */
export function AdminTopBar({
  isCollapsed,
  onToggleCollapsed,
  isMobileMenuOpen,
  onOpenMobileMenu,
}: AdminTopBarProps) {
  const router = useRouter();
  const { user, setUser } = useCurrentUser();
  const flash = useFlash();

  const signOut = async () => {
    try {
      await logoutUser();
    } catch {
      // Si falla la petición, la sesión sigue activa y el botón permanece visible.
      return;
    }
    await setUser(null);
    flash.success("Cerraste sesión.");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-foreground/10 bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-expanded={isMobileMenuOpen}
          aria-controls="admin-sidebar"
          aria-label="Abrir menú de administración"
          className={`inline-flex size-10 items-center justify-center rounded-md hover:bg-foreground/5 lg:hidden ${focusClassName}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!isCollapsed}
          aria-controls="admin-sidebar"
          aria-label={isCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
          className={`hidden size-10 items-center justify-center rounded-md hover:bg-foreground/5 lg:inline-flex ${focusClassName}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
            <path d={isCollapsed ? "m14 9 3 3-3 3" : "m17 9-3 3 3 3"} />
          </svg>
        </button>
        <p className="hidden text-sm font-semibold text-foreground/70 sm:block">
          Panel de administración
        </p>
      </div>

      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        {user && (
          <div className="hidden text-right leading-tight sm:block">
            <p className="max-w-48 truncate text-sm font-medium" title={user.name}>
              {user.name}
            </p>
            <p className="text-xs text-foreground/70">Administrador</p>
          </div>
        )}
        <button
          type="button"
          onClick={signOut}
          className={`inline-flex h-10 items-center whitespace-nowrap rounded-md border border-foreground/20 px-4 text-sm font-semibold hover:bg-foreground/5 ${focusClassName}`}
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

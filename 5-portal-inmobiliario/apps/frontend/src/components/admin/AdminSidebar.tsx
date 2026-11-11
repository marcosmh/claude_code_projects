"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { adminNavigation, isAdminItemActive } from "@/lib/admin-navigation";
import { AdminIcon } from "./AdminIcon";

type AdminSidebarProps = {
  /** Solo escritorio: muestra únicamente los iconos. */
  isCollapsed: boolean;
  /** Solo móvil: el panel está abierto sobre el contenido. */
  isMobileOpen: boolean;
  onNavigate: () => void;
};

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring";

/** Barra lateral de administración: colapsable en escritorio, panel deslizante en móvil. */
export function AdminSidebar({ isCollapsed, isMobileOpen, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      id="admin-sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform motion-reduce:transition-none",
        "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-[width]",
        isCollapsed ? "lg:w-[4.5rem]" : "lg:w-64",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 32 32"
          className="size-8 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="32" height="32" rx="8" fill="#4338ca" />
          <path d="M9 25V9.5A1.5 1.5 0 0 1 10.5 8h6A1.5 1.5 0 0 1 18 9.5V25H9Z" fill="#ffffff" />
          <path d="M18 14h4.5a1.5 1.5 0 0 1 1.5 1.5V25h-6V14Z" fill="#ffffff" opacity="0.7" />
        </svg>
        <div className={cn("min-w-0 leading-tight", isCollapsed && "lg:hidden")} translate="no">
          <p className="truncate text-sm font-bold">Portal Inmobiliario</p>
          <p className="truncate text-xs text-sidebar-muted">Administración</p>
        </div>
      </div>

      <nav aria-label="Menú de administración" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {adminNavigation.map((item) => {
            const content = (
              <>
                <AdminIcon name={item.icon} />
                <span className={cn("min-w-0 flex-1 leading-tight", isCollapsed && "lg:sr-only")}>
                  {item.label}
                  {item.href === null && (
                    <span className="mt-0.5 block text-[0.65rem] font-medium uppercase tracking-wide">
                      Próximamente
                    </span>
                  )}
                </span>
              </>
            );
            const baseClassName = cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              isCollapsed && "lg:justify-center lg:px-0",
            );

            return (
              <li key={item.id}>
                {item.href === null ? (
                  <span
                    aria-disabled="true"
                    title={`${item.label} (próximamente)`}
                    className={cn(baseClassName, "cursor-not-allowed text-sidebar-muted")}
                  >
                    {content}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={item.label}
                    aria-current={isAdminItemActive(pathname, item.href) ? "page" : undefined}
                    className={cn(
                      baseClassName,
                      "transition-colors hover:bg-sidebar-active motion-reduce:transition-none",
                      "aria-[current=page]:bg-sidebar-active aria-[current=page]:text-white",
                      focusClassName,
                    )}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

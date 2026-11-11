"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AccountControls } from "@/components/layout/AccountControls";
import { LogoMark } from "@/components/layout/LogoMark";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { cn } from "@/lib/cn";
import { headerMenuItems, isNavigationItemActive } from "@/lib/navigation";

export function Header() {
  const currentPathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="flex items-center gap-2 text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <LogoMark className="size-8 shrink-0" />
          <span translate="no">Portal Inmobiliario</span>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          <nav aria-label="Navegación principal">
            <ul className="flex items-center gap-1">
              {headerMenuItems.map((item) => {
                const isActive = isNavigationItemActive(currentPathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        isActive && "bg-foreground/10",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <ThemeSwitcher />
          <AccountControls variant="desktop" />
        </div>

        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setIsMobileMenuOpen((wasOpen) => !wasOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {isMobileMenuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      <nav
        id="mobile-navigation"
        aria-label="Navegación móvil"
        hidden={!isMobileMenuOpen}
        className="border-t border-foreground/10 lg:hidden"
      >
        <ul className="flex flex-col px-4 py-2 sm:px-6">
          {headerMenuItems.map((item) => {
            const isActive = isNavigationItemActive(currentPathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMobileMenu}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-3 text-base font-medium hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isActive && "bg-foreground/10",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="space-y-3 border-t border-foreground/10 px-4 py-3 sm:px-6">
          <AccountControls variant="mobile" onNavigate={closeMobileMenu} />
          <ThemeSwitcher showLabels align="left" />
        </div>
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const ICONS = {
  dashboard: <path d="M3 3h6v6H3zM11 3h6v3.5h-6zM11 9h6v8h-6zM3 11h6v6H3z" />,
  invoices: (
    <>
      <path d="M5 2.5h7l3 3v12H5z" />
      <path d="M8 10h4M8 13h4" />
    </>
  ),
};

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { href: "/invoices", label: "Facturas", icon: ICONS.invoices },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      id="main-menu"
      className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 [.menu-collapsed_&]:hidden md:sticky md:top-12 md:h-[calc(100vh-3rem)] md:w-56 md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0 md:py-5"
    >
      <nav className="flex gap-1 md:flex-1 md:flex-col" aria-label="Principal">
        {LINKS.map((l) => {
          const current = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                current
                  ? "bg-primary font-medium text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
                {l.icon}
              </svg>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between md:border-t md:border-zinc-200 md:px-2 md:pt-4">
        <span className="hidden text-xs text-zinc-500 md:inline">Tema oscuro</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}

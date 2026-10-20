"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/invoices", label: "Facturas", icon: "☰" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      id="main-menu"
      className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 [.menu-collapsed_&]:hidden md:sticky md:top-12 md:h-[calc(100vh-3rem)] md:w-56 md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0 md:py-6"
    >
      <p className="font-semibold md:mb-6 md:px-2">Menú</p>
      <nav className="flex gap-1 md:flex-1 md:flex-col" aria-label="Principal">
        {LINKS.map((l) => {
          const current = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current ? "page" : undefined}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                current ? "bg-zinc-100 font-medium" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span aria-hidden className="w-4 text-center">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between md:px-2">
        <span className="hidden text-xs text-zinc-500 md:inline">Tema</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}

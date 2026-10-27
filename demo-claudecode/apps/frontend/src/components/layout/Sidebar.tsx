import { NavLink } from "react-router";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: <path d="M3 3h6v6H3zM11 3h6v3.5h-6zM11 9h6v8h-6zM3 11h6v6H3z" /> },
  {
    to: "/invoices",
    label: "Facturas",
    icon: (
      <>
        <path d="M5 2.5h7l3 3v12H5z" />
        <path d="M8 10h4M8 13h4" />
      </>
    ),
  },
];

export function Sidebar() {
  return (
    <aside
      id="main-menu"
      className="flex items-center gap-4 border-b border-zinc-200 px-4 py-3 [.menu-collapsed_&]:hidden md:sticky md:top-12 md:h-[calc(100vh-3rem)] md:w-56 md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0 md:py-5"
    >
      <nav className="flex gap-1 md:flex-1 md:flex-col" aria-label="Principal">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? "bg-primary font-medium text-on-primary" : "text-zinc-700 hover:bg-zinc-100"
              }`
            }
          >
            <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
              {l.icon}
            </svg>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

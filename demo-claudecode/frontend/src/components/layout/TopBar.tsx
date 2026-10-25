import { useUiStore } from "@/store/uiStore";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export function TopBar() {
  const collapsed = useUiStore((s) => s.menuCollapsed);
  const toggle = useUiStore((s) => s.toggleMenu);

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-zinc-200 bg-surface px-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-controls="main-menu"
        aria-label={collapsed ? "Mostrar menú" : "Ocultar menú"}
        className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-brand hover:bg-zinc-200"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M3 5.5h14M3 10h14M3 14.5h14" />
        </svg>
      </button>
      <span aria-hidden className="flex size-6 items-center justify-center rounded-md bg-primary text-on-primary">
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 2.5h7l3 3v12H5z" />
          <path d="M8 10h4M8 13h4" />
        </svg>
      </span>
      <span className="text-lg font-bold">Facturas</span>
      <div className="ml-auto flex items-center gap-3">
        <UserMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}

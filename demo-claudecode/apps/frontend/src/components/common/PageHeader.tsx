import type { ReactNode } from "react";
import { Link } from "react-router";

interface Crumb {
  label: string;
  to?: string;
}

/** Migas de pan, título y acciones de la página. */
export function PageHeader({ title, trail = [], children }: { title: string; trail?: Crumb[]; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-4">
      <div>
        <nav aria-label="Ruta" className="mb-1 flex items-center gap-1.5 text-sm text-zinc-500">
          <Link to="/dashboard" className="hover:text-zinc-900 hover:underline">
            Inicio
          </Link>
          {trail.map((t) => (
            <span key={t.label} className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              {t.to ? (
                <Link to={t.to} className="hover:text-zinc-900 hover:underline">
                  {t.label}
                </Link>
              ) : (
                t.label
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      {children}
    </header>
  );
}

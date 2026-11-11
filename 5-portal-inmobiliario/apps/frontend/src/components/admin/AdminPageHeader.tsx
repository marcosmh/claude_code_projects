import Link from "next/link";
import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs: { label: string; href?: string }[];
  actions?: ReactNode;
};

/** Cabecera de las páginas del área de administración: migas de pan, título y acciones. */
export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <nav aria-label="Ruta de navegación" className="text-sm text-foreground/70">
          <ol className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {index > 0 && <span aria-hidden="true">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-2 text-balance text-3xl font-bold">{title}</h1>
        {description && <p className="mt-2 text-foreground/70">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

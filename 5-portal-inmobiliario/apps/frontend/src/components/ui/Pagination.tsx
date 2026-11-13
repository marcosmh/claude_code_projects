import Link from "next/link";
import type { ReactNode } from "react";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Nombre accesible de la navegación. */
  label?: string;
  /** Modo enlaces (catálogo): cada control es un `<Link>` que conserva la búsqueda y los filtros. */
  buildHref?: (page: number) => string;
  /** Modo botones (listas de administración y cuenta). */
  onPageChange?: (page: number) => void;
};

export type PageItem = number | "start-ellipsis" | "end-ellipsis";

const MAX_VISIBLE_PAGES = 7;

/** Numeración: todas las páginas si son pocas; si no, primera, última y vecinas de la actual con «…». */
export function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const windowStart = Math.max(2, Math.min(page - 1, totalPages - 3));
  const windowEnd = Math.min(totalPages - 1, Math.max(page + 1, 4));
  const items: PageItem[] = [1];
  if (windowStart > 2) items.push("start-ellipsis");
  for (let current = windowStart; current <= windowEnd; current += 1) items.push(current);
  if (windowEnd < totalPages - 1) items.push("end-ellipsis");
  items.push(totalPages);
  return items;
}

const controlClassName =
  "inline-flex size-9 items-center justify-center rounded-md border border-foreground/20 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const enabledClassName = `${controlClassName} hover:bg-foreground/5`;
const disabledClassName = `${controlClassName} cursor-not-allowed opacity-40`;
const currentClassName = `${controlClassName} border-primary bg-primary text-primary-foreground`;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const icons = {
  first: (
    <Icon>
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </Icon>
  ),
  previous: (
    <Icon>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  ),
  next: (
    <Icon>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  ),
  last: (
    <Icon>
      <path d="m6 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </Icon>
  ),
};

/**
 * Paginador con iconos: primera página, anterior, numeración, siguiente y última página.
 * No se muestra si hay una sola página (spec §63).
 */
export function Pagination({
  page,
  totalPages,
  label = "Paginación",
  buildHref,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  function renderControl(
    targetPage: number,
    accessibleName: string,
    content: ReactNode,
    options: { isDisabled?: boolean; isCurrent?: boolean; rel?: "prev" | "next" } = {},
  ) {
    const { isDisabled = false, isCurrent = false, rel } = options;
    if (isDisabled) {
      // En modo enlaces no hay destino al que ir: un `span` inerte; en modo botones, un botón desactivado.
      return buildHref ? (
        <span aria-hidden="true" className={disabledClassName}>
          {content}
        </span>
      ) : (
        <button type="button" disabled aria-label={accessibleName} className={disabledClassName}>
          {content}
        </button>
      );
    }
    const className = isCurrent ? currentClassName : enabledClassName;
    const ariaCurrent = isCurrent ? ("page" as const) : undefined;
    if (buildHref) {
      return (
        <Link
          href={buildHref(targetPage)}
          rel={rel}
          aria-label={accessibleName}
          aria-current={ariaCurrent}
          className={className}
        >
          {content}
        </Link>
      );
    }
    return (
      <button
        type="button"
        aria-label={accessibleName}
        aria-current={ariaCurrent}
        onClick={() => onPageChange?.(targetPage)}
        className={className}
      >
        {content}
      </button>
    );
  }

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <nav aria-label={label} className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      {renderControl(1, "Primera página", icons.first, { isDisabled: isFirstPage })}
      {renderControl(page - 1, "Anterior", icons.previous, {
        isDisabled: isFirstPage,
        rel: "prev",
      })}
      {buildPageItems(page, totalPages).map((item) =>
        typeof item === "number" ? (
          <span key={item}>
            {renderControl(item, `Página ${item}`, item, { isCurrent: item === page })}
          </span>
        ) : (
          <span key={item} aria-hidden="true" className="px-1 text-foreground/60">
            …
          </span>
        ),
      )}
      {renderControl(page + 1, "Siguiente", icons.next, { isDisabled: isLastPage, rel: "next" })}
      {renderControl(totalPages, "Última página", icons.last, { isDisabled: isLastPage })}
      <p className="sr-only" aria-live="polite">
        Página {page} de {totalPages}
      </p>
    </nav>
  );
}

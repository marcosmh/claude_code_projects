import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

const linkClassName =
  "rounded-md border border-foreground/20 px-4 py-2 text-sm font-semibold hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginación" className="mt-8 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} rel="prev" className={linkClassName}>
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-foreground/70" aria-live="polite">
        Página {page} de {totalPages}
      </p>
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} rel="next" className={linkClassName}>
          Siguiente →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

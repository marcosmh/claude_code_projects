import { button } from "@/components/common/ui";
import type { PageMeta } from "@/types/invoice";

export function Pagination({ meta, onPageChange }: { meta: PageMeta; onPageChange: (page: number) => void }) {
  if (meta.totalPages <= 1) return null;
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-zinc-600" aria-live="polite">
        Página {meta.page} de {meta.totalPages} ({meta.total} facturas)
      </p>
      <div className="flex gap-2">
        <button type="button" className={button("secondary", "sm")} disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
          Anterior
        </button>
        <button
          type="button"
          className={button("secondary", "sm")}
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}

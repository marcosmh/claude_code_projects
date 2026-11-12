"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { buildAdminAuditUrl, fetchAdminAudit } from "@portal/api-client";
import { auditCategoryValues, type AuditCategory } from "@portal/shared-types";
import { auditActionLabels, auditCategoryLabels, auditWarningActions } from "@/lib/audit-labels";
import { AdminPageHeader } from "./AdminPageHeader";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "medium",
});

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const controlClassName = `h-10 rounded-md border border-foreground/20 bg-surface px-3 text-sm text-foreground ${focusClassName}`;
const secondaryButtonClassName = `inline-flex h-9 items-center rounded-md border border-foreground/20 px-3 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50 ${focusClassName}`;
const linkClassName = `font-medium text-link underline underline-offset-2 ${focusClassName}`;

/** Enlace a la ficha de administración cuando la entidad todavía tiene una. */
function entityHref(entityType: string | null, entityId: string | null): string | null {
  if (entityId === null) return null;
  if (entityType === "property") return `/admin/properties/${encodeURIComponent(entityId)}/edit`;
  return null;
}

/** Registro de auditoría (solo lectura): quién hizo qué, cuándo y desde qué IP (spec §60). */
export function AdminAuditList() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<AuditCategory | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const isRangeInverted = from !== "" && to !== "" && from > to;
  const activeFilterCount = [searchText, category, from, to].filter((value) => value !== "").length;

  // Un rango invertido no se envía: la API lo rechazaría con 400.
  const { data, error, mutate, isValidating } = useSWR(
    buildAdminAuditUrl({
      page,
      search: searchText,
      ...(category !== "" && { category }),
      ...(!isRangeInverted && { from, to }),
    }),
    fetchAdminAudit,
    { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: true },
  );
  const totalPages = data?.totalPages ?? 1;

  const resetFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearchText("");
    setCategory("");
    setFrom("");
    setTo("");
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <AdminPageHeader
        title="Auditoría y logs"
        description="Registro de accesos y de las acciones de administración. Es de solo lectura."
        breadcrumbs={[{ label: "Administración", href: "/admin" }, { label: "Auditoría" }]}
        actions={
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isValidating}
            className={`h-10 ${secondaryButtonClassName}`}
          >
            {isValidating && data !== undefined ? "Actualizando…" : "Actualizar"}
          </button>
        }
      />

      <form
        role="search"
        aria-label="Filtros del registro de auditoría"
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearchText(searchInput.trim());
        }}
      >
        <div className="min-w-56 flex-1">
          <label htmlFor="audit-search" className="block text-sm font-medium">
            Buscar
          </label>
          <input
            id="audit-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Resumen, email o id…"
            maxLength={100}
            className={`mt-1 w-full ${controlClassName}`}
          />
        </div>
        <div>
          <label htmlFor="audit-category" className="block text-sm font-medium">
            Categoría
          </label>
          <select
            id="audit-category"
            value={category}
            onChange={(event) => {
              setPage(1);
              setCategory(event.target.value as AuditCategory | "");
            }}
            className={`mt-1 ${controlClassName}`}
          >
            <option value="">Todas</option>
            {auditCategoryValues.map((value) => (
              <option key={value} value={value}>
                {auditCategoryLabels[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="audit-from" className="block text-sm font-medium">
            Desde
          </label>
          <input
            id="audit-from"
            type="date"
            value={from}
            max={to || undefined}
            aria-invalid={isRangeInverted}
            aria-describedby={isRangeInverted ? "audit-range-error" : undefined}
            onChange={(event) => {
              setPage(1);
              setFrom(event.target.value);
            }}
            className={`mt-1 ${controlClassName}`}
          />
        </div>
        <div>
          <label htmlFor="audit-to" className="block text-sm font-medium">
            Hasta
          </label>
          <input
            id="audit-to"
            type="date"
            value={to}
            min={from || undefined}
            aria-invalid={isRangeInverted}
            onChange={(event) => {
              setPage(1);
              setTo(event.target.value);
            }}
            className={`mt-1 ${controlClassName}`}
          />
        </div>
        <button type="submit" className={`h-10 ${secondaryButtonClassName}`}>
          Buscar
        </button>
        <button
          type="button"
          onClick={resetFilters}
          disabled={activeFilterCount === 0 && searchInput === ""}
          className={`h-10 ${secondaryButtonClassName}`}
        >
          Limpiar filtros
        </button>
      </form>
      {isRangeInverted && (
        <p id="audit-range-error" role="alert" className="mt-2 text-sm text-danger">
          La fecha inicial no puede ser posterior a la final.
        </p>
      )}

      <section
        aria-label="Registro de auditoría"
        className="mt-4 overflow-hidden rounded-xl border border-foreground/10 bg-surface shadow-sm"
      >
        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"
          >
            <p>No pudimos cargar el registro. Revisa tu conexión y vuelve a intentarlo.</p>
            <button
              type="button"
              onClick={() => void mutate()}
              disabled={isValidating}
              className={secondaryButtonClassName}
            >
              {isValidating ? "Reintentando…" : "Reintentar"}
            </button>
          </div>
        ) : data === undefined ? (
          <p role="status" className="p-5 text-sm text-foreground/70">
            Cargando registro…
          </p>
        ) : data.items.length === 0 ? (
          <p className="p-5 text-sm text-foreground/70">
            No hay eventos que coincidan con los filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <caption className="sr-only">
                Eventos del sistema, del más reciente al más antiguo
              </caption>
              <thead className="bg-foreground/[0.04] text-xs uppercase tracking-wide text-foreground/70">
                <tr>
                  {["Fecha", "Acción", "Resumen", "Responsable", "IP"].map((heading) => (
                    <th key={heading} scope="col" className="px-5 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {data.items.map((entry) => {
                  const href = entityHref(entry.entityType, entry.entityId);
                  const isWarning = auditWarningActions.has(entry.action);
                  return (
                    <tr key={entry.id} className="align-top">
                      <th
                        scope="row"
                        className="whitespace-nowrap px-5 py-3 font-normal text-foreground/70"
                      >
                        <time dateTime={entry.createdAt}>
                          {dateFormatter.format(new Date(entry.createdAt))}
                        </time>
                      </th>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            isWarning
                              ? "border-danger/40 text-danger"
                              : "border-foreground/20 text-foreground"
                          }`}
                        >
                          {auditActionLabels[entry.action] ?? entry.action}
                        </span>
                        <span className="mt-1 block text-xs text-foreground/60">
                          {auditCategoryLabels[entry.category]}
                        </span>
                      </td>
                      <td className="max-w-md break-words px-5 py-3">
                        {entry.summary}
                        {href && (
                          <>
                            {" "}
                            <Link href={href} className={linkClassName}>
                              Ver propiedad
                            </Link>
                          </>
                        )}
                      </td>
                      <td className="break-all px-5 py-3">
                        {entry.actorEmail ?? <span className="text-foreground/70">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-foreground/70">
                        {entry.ipAddress ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data !== undefined && (
        <p className="mt-2 text-sm text-foreground/70" aria-live="polite">
          {data.total} evento(s)
        </p>
      )}

      {totalPages > 1 && (
        <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className={secondaryButtonClassName}
          >
            ← Anterior
          </button>
          <span className="text-sm text-foreground/70">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className={secondaryButtonClassName}
          >
            Siguiente →
          </button>
        </nav>
      )}
    </div>
  );
}

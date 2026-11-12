"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  adminPropertiesUrl,
  buildAdminPropertiesUrl,
  deleteAdminProperty,
  fetchAdminProperties,
  type AdminPropertiesQuery,
} from "@portal/api-client";
import type { AdminPropertyListItemDto } from "@portal/shared-types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatOperation, formatPrice } from "@/lib/format";
import { AdminPageHeader } from "./AdminPageHeader";
import {
  AdminPropertyFilters,
  countAdminFilters,
  emptyAdminFilters,
  toAdminQuery,
  type AdminAdvancedFilters,
} from "./AdminPropertyFilters";
import { useFlash } from "@/hooks/useFlash";

type StatusFilter = NonNullable<AdminPropertiesQuery["status"]>;

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "published", label: "Publicadas" },
  { value: "draft", label: "Borradores" },
];

const FILTERS_PANEL_ID = "admin-property-filters";

const dateFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const controlClassName = `h-10 rounded-md border border-foreground/20 bg-surface px-3 text-sm text-foreground ${focusClassName}`;
const iconButtonClassName = `inline-flex size-9 items-center justify-center rounded-md border border-foreground/20 transition-colors hover:bg-foreground/5 ${focusClassName}`;
const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "size-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const secondaryButtonClassName = `inline-flex h-9 items-center rounded-md border border-foreground/20 px-3 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50 ${focusClassName}`;

/** Listado de administración: todas las propiedades (incluye borradores) con búsqueda, estado y paginación. */
export function AdminPropertiesList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<AdminAdvancedFilters>(emptyAdminFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [pendingDeletion, setPendingDeletion] = useState<AdminPropertyListItemDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const flash = useFlash();
  const { mutate: mutateMatching } = useSWRConfig();

  const { data, error, mutate, isValidating } = useSWR(
    buildAdminPropertiesUrl({
      page,
      search: searchText,
      status,
      ...toAdminQuery(advancedFilters),
    }),
    fetchAdminProperties,
    { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: true },
  );

  const totalPages = data?.totalPages ?? 1;
  const activeFilterCount = countAdminFilters(advancedFilters);

  async function confirmDeletion() {
    if (pendingDeletion === null) return;
    setIsDeleting(true);
    try {
      await deleteAdminProperty(pendingDeletion.id);
      // La propiedad eliminada también sale del dashboard y de cualquier otra página en caché.
      await mutateMatching((key) => typeof key === "string" && key.startsWith(adminPropertiesUrl));
      if (data?.items.length === 1 && page > 1) setPage(page - 1);
      setDeletionError(null);
      setPendingDeletion(null);
      flash.success(`Se eliminó «${pendingDeletion.title}».`);
    } catch {
      setDeletionError("No pudimos eliminar la propiedad. Inténtalo de nuevo.");
      flash.error("No pudimos eliminar la propiedad. Inténtalo de nuevo.");
      setPendingDeletion(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <AdminPageHeader
        title="Administrar propiedades"
        description="Todas las propiedades del portal, publicadas o en borrador."
        breadcrumbs={[{ label: "Administración", href: "/admin" }, { label: "Propiedades" }]}
        actions={
          <Link
            href="/admin/properties/new"
            className={`inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 ${focusClassName}`}
          >
            Nueva propiedad
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <form
          role="search"
          className="flex min-w-0 flex-1 items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearchText(searchInput.trim());
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-properties-search" className="block text-sm font-medium">
              Buscar propiedades
            </label>
            <input
              id="admin-properties-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Título, ciudad, colonia…"
              maxLength={100}
              className={`mt-1 w-full ${controlClassName}`}
            />
          </div>
          <button type="submit" className={`h-10 ${secondaryButtonClassName}`}>
            Buscar
          </button>
        </form>
        <div>
          <label htmlFor="admin-properties-status" className="block text-sm font-medium">
            Estado
          </label>
          <select
            id="admin-properties-status"
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as StatusFilter);
            }}
            className={`mt-1 ${controlClassName}`}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-expanded={isFiltersOpen}
          aria-controls={FILTERS_PANEL_ID}
          aria-label={`${isFiltersOpen ? "Ocultar" : "Mostrar"} filtros${
            activeFilterCount > 0 ? `, ${activeFilterCount} activos` : ""
          }`}
          title={isFiltersOpen ? "Ocultar filtros" : "Mostrar filtros"}
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className={`relative inline-flex size-10 items-center justify-center rounded-md border border-foreground/20 transition-colors hover:bg-foreground/5 ${
            isFiltersOpen ? "bg-foreground/5" : ""
          } ${focusClassName}`}
        >
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
            <path d="M3 5h18l-7 8v6l-4 2v-8Z" />
          </svg>
          {activeFilterCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground"
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {deletionError && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm"
            >
              {deletionError}
            </p>
          )}

          <section
            aria-label="Listado de propiedades"
            className="overflow-hidden rounded-xl border border-foreground/10 bg-surface shadow-sm"
          >
            {error ? (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"
              >
                <p>No pudimos cargar las propiedades. Revisa tu conexión y vuelve a intentarlo.</p>
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
                Cargando propiedades…
              </p>
            ) : data.items.length === 0 ? (
              <p className="p-5 text-sm text-foreground/70">
                No hay propiedades que coincidan con la búsqueda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[48rem] text-left text-sm">
                  <caption className="sr-only">Propiedades del portal</caption>
                  <thead className="bg-foreground/[0.04] text-xs uppercase tracking-wide text-foreground/70">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Propiedad
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Operación
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        Precio
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Estado
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Actualizada
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/10">
                    {data.items.map((property) => (
                      <tr key={property.id}>
                        <th scope="row" className="max-w-64 px-5 py-3 font-medium">
                          <span className="block truncate" title={property.title}>
                            {property.title}
                          </span>
                          <span className="block truncate text-xs font-normal text-foreground/70">
                            {property.commune}, {property.city}
                          </span>
                        </th>
                        <td className="px-5 py-3">{formatOperation(property.operation)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                          {formatPrice(property.price, property.currency, property.operation)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={
                              property.isPublished
                                ? "inline-flex rounded-full bg-success-surface px-2.5 py-0.5 text-xs font-semibold text-success"
                                : "inline-flex rounded-full bg-warning-surface px-2.5 py-0.5 text-xs font-semibold text-warning"
                            }
                          >
                            {property.isPublished ? "Publicada" : "Borrador"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-foreground/70">
                          {dateFormatter.format(new Date(property.updatedAt))}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/properties/${encodeURIComponent(property.id)}/edit`}
                              aria-label={`Editar ${property.title}`}
                              title="Editar"
                              className={iconButtonClassName}
                            >
                              <svg {...iconProps}>
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </Link>
                            <button
                              type="button"
                              aria-label={`Eliminar ${property.title}`}
                              title="Eliminar"
                              onClick={() => setPendingDeletion(property)}
                              className={`${iconButtonClassName} text-danger`}
                            >
                              <svg {...iconProps}>
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {totalPages > 1 && (
            <nav
              aria-label="Paginación de propiedades"
              className="mt-4 flex items-center justify-between gap-4"
            >
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className={secondaryButtonClassName}
              >
                ← Anterior
              </button>
              <p className="text-sm text-foreground/70" aria-live="polite">
                Página {page} de {totalPages}
              </p>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className={secondaryButtonClassName}
              >
                Siguiente →
              </button>
            </nav>
          )}
        </div>

        {/* Panel derecho colapsable; en pantallas estrechas queda bajo la lista. */}
        <aside hidden={!isFiltersOpen} className="lg:sticky lg:top-4 lg:w-72 lg:shrink-0">
          <AdminPropertyFilters
            id={FILTERS_PANEL_ID}
            filters={advancedFilters}
            onChange={(next) => {
              setPage(1);
              setAdvancedFilters(next);
            }}
          />
        </aside>
      </div>

      {pendingDeletion && (
        <ConfirmDialog
          title="¿Deseas eliminar esta propiedad?"
          description={`Se eliminará «${pendingDeletion.title}» y dejará de mostrarse en el portal.`}
          confirmLabel="Sí, eliminar"
          cancelLabel="No, cancelar"
          isBusy={isDeleting}
          onConfirm={() => void confirmDeletion()}
          onCancel={() => setPendingDeletion(null)}
        />
      )}
    </div>
  );
}

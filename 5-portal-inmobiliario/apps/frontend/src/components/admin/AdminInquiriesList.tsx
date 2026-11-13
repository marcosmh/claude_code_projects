"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { buildAdminInquiriesUrl, fetchAdminInquiries } from "@portal/api-client";
import { parsePageParam, useClampPage, useUrlQuery } from "@/hooks/useUrlQuery";
import { AdminPageHeader } from "./AdminPageHeader";

const dateFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const controlClassName = `h-10 rounded-md border border-foreground/20 bg-surface px-3 text-sm text-foreground ${focusClassName}`;
const secondaryButtonClassName = `inline-flex h-9 items-center rounded-md border border-foreground/20 px-3 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50 ${focusClassName}`;
const linkClassName = `font-medium text-link underline underline-offset-2 ${focusClassName}`;

/** Consultas recibidas: propiedad (con enlace), usuario, contacto, mensaje y fecha. */
export function AdminInquiriesList() {
  const { values, update } = useUrlQuery({ page: "1", search: "" });
  const page = parsePageParam(values.page);
  const searchText = values.search;
  const [searchInput, setSearchInput] = useState(searchText);

  const { data, error, mutate, isValidating } = useSWR(
    buildAdminInquiriesUrl({ page, search: searchText }),
    fetchAdminInquiries,
    { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: true },
  );
  const totalPages = data?.totalPages ?? 1;
  useClampPage(page, data?.totalPages, (lastPage) => update({ page: String(lastPage) }));

  return (
    <div className="mx-auto w-full max-w-7xl">
      <AdminPageHeader
        title="Administrar consultas"
        description="Consultas enviadas por visitantes y usuarios sobre las propiedades."
        breadcrumbs={[{ label: "Administración", href: "/admin" }, { label: "Consultas" }]}
      />

      <form
        role="search"
        className="mt-6 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          update({ page: "1", search: searchInput.trim() });
        }}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="admin-inquiries-search" className="block text-sm font-medium">
            Buscar consultas
          </label>
          <input
            id="admin-inquiries-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nombre, email, mensaje o propiedad…"
            maxLength={100}
            className={`mt-1 w-full ${controlClassName}`}
          />
        </div>
        <button type="submit" className={`h-10 ${secondaryButtonClassName}`}>
          Buscar
        </button>
      </form>

      <section
        aria-label="Listado de consultas"
        className="mt-4 overflow-hidden rounded-xl border border-foreground/10 bg-surface shadow-sm"
      >
        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"
          >
            <p>No pudimos cargar las consultas. Revisa tu conexión y vuelve a intentarlo.</p>
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
            Cargando consultas…
          </p>
        ) : data.items.length === 0 ? (
          <p className="p-5 text-sm text-foreground/70">
            No hay consultas que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <caption className="sr-only">Consultas recibidas</caption>
              <thead className="bg-foreground/[0.04] text-xs uppercase tracking-wide text-foreground/70">
                <tr>
                  {["Propiedad", "Contacto", "Usuario", "Mensaje", "Fecha"].map((heading) => (
                    <th key={heading} scope="col" className="px-5 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {data.items.map((inquiry) => (
                  <tr key={inquiry.id} className="align-top">
                    <th scope="row" className="max-w-56 px-5 py-3 font-medium">
                      {inquiry.propertyDeleted ? (
                        <>
                          <span className="block truncate" title={inquiry.propertyTitle}>
                            {inquiry.propertyTitle}
                          </span>
                          <span className="inline-flex rounded-full bg-warning-surface px-2.5 py-0.5 text-xs font-semibold text-warning">
                            Eliminada
                          </span>
                        </>
                      ) : (
                        <Link
                          href={`/admin/properties/${encodeURIComponent(inquiry.propertyId)}/edit`}
                          className={linkClassName}
                          title={`Editar ${inquiry.propertyTitle}`}
                        >
                          {inquiry.propertyTitle}
                        </Link>
                      )}
                    </th>
                    <td className="px-5 py-3">
                      <span className="block font-medium">{inquiry.name}</span>
                      <a href={`mailto:${inquiry.email}`} className={linkClassName}>
                        {inquiry.email}
                      </a>
                      {inquiry.phone && (
                        <a
                          href={`tel:${inquiry.phone.replace(/[^\d+]/g, "")}`}
                          className={`block ${linkClassName}`}
                        >
                          {inquiry.phone}
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {inquiry.userName ?? <span className="text-foreground/70">Visitante</span>}
                    </td>
                    <td className="max-w-md whitespace-pre-line break-words px-5 py-3">
                      {inquiry.message}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-foreground/70">
                      {dateFormatter.format(new Date(inquiry.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
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
            onClick={() => update({ page: String(page + 1) })}
            className={secondaryButtonClassName}
          >
            Siguiente →
          </button>
        </nav>
      )}
    </div>
  );
}

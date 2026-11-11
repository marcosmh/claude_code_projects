"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  buildAdminPropertiesUrl,
  fetchAdminProperties,
  type AdminPropertiesQuery,
} from "@portal/api-client";
import { formatOperation, formatPrice } from "@/lib/format";

const ROWS_PER_TABLE = 5;

const statusOptions: { value: NonNullable<AdminPropertiesQuery["status"]>; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "published", label: "Publicadas" },
  { value: "draft", label: "Borradores" },
];

const dateFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

/** Tabla de las propiedades modificadas más recientemente (incluye borradores) con filtro de estado. */
export function RecentPropertiesTable() {
  const [status, setStatus] = useState<NonNullable<AdminPropertiesQuery["status"]>>("all");
  const { data, error, mutate, isValidating } = useSWR(
    buildAdminPropertiesUrl({ pageSize: ROWS_PER_TABLE, status }),
    fetchAdminProperties,
    { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: true },
  );

  return (
    <section
      aria-labelledby="admin-recent-properties-title"
      className="mt-8 overflow-hidden rounded-xl border border-foreground/10 bg-surface shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 px-5 py-4">
        <div>
          <h2 id="admin-recent-properties-title" className="text-lg font-semibold">
            Propiedades recientes
          </h2>
          <p className="text-sm text-foreground/70">
            Últimas modificadas, incluidos los borradores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="admin-recent-status" className="text-sm font-medium">
            Estado
          </label>
          <select
            id="admin-recent-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="h-10 rounded-md border border-foreground/20 bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
          <p>No pudimos cargar las propiedades. Revisa tu conexión y vuelve a intentarlo.</p>
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isValidating}
            className="rounded-md border border-foreground/20 px-4 py-2 font-semibold hover:bg-foreground/5 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {isValidating ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : data === undefined ? (
        <p role="status" className="p-5 text-sm text-foreground/70">
          Cargando propiedades…
        </p>
      ) : data.items.length === 0 ? (
        <p className="p-5 text-sm text-foreground/70">No hay propiedades con ese estado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Propiedades modificadas recientemente</caption>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

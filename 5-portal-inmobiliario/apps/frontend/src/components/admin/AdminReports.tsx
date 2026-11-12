"use client";

import Link from "next/link";
import useSWR from "swr";
import { adminReportsUrl, fetchAdminReports } from "@portal/api-client";
import type { AdminReportsDto, ReportTopPropertyDto } from "@portal/shared-types";
import { formatAvailability, formatOperation, formatPropertyType } from "@/lib/format";
import { AdminPageHeader } from "./AdminPageHeader";
import { BarList, MonthlyChart, ReportCard } from "./ReportCharts";

const numberFormatter = new Intl.NumberFormat("es-MX");
const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});
const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function formatMonth(month: string): string {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

function formatAverage(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SummaryCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-surface p-5 shadow-sm">
      <dt className="text-sm font-medium text-foreground/70">{label}</dt>
      <dd className="mt-2 text-3xl font-bold tabular-nums">{numberFormatter.format(value)}</dd>
      {hint && <p className="mt-1 text-xs text-foreground/60">{hint}</p>}
    </div>
  );
}

function TopPropertiesList({
  items,
  singularUnit,
  pluralUnit,
  emptyText,
}: {
  items: ReportTopPropertyDto[];
  singularUnit: string;
  pluralUnit: string;
  emptyText: string;
}) {
  if (items.length === 0) return <p className="text-sm text-foreground/70">{emptyText}</p>;
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
          <Link
            href={`/properties/${encodeURIComponent(item.id)}`}
            className={`min-w-0 truncate underline-offset-2 hover:underline ${focusClassName}`}
          >
            <span className="mr-2 text-foreground/60">{index + 1}.</span>
            {item.title}
          </Link>
          <span className="shrink-0 font-semibold tabular-nums">
            {numberFormatter.format(item.count)}{" "}
            <span className="font-normal text-foreground/60">
              {item.count === 1 ? singularUnit : pluralUnit}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function ReportsContent({ data }: { data: AdminReportsDto }) {
  const { properties, inquiries, favorites, users, monthly } = data;
  const propertyTotal = properties.byVisibility.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <>
      <section aria-label="Resumen" className="mt-8">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Propiedades" value={propertyTotal} />
          <SummaryCard
            label="Consultas"
            value={inquiries.total}
            hint={`${numberFormatter.format(inquiries.last30Days)} en los últimos 30 días`}
          />
          <SummaryCard label="Favoritos guardados" value={favorites.total} />
          <SummaryCard
            label="Usuarios"
            value={users.total}
            hint={`${numberFormatter.format(users.admins)} administrador(es)`}
          />
        </dl>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ReportCard id="report-monthly" title="Actividad de los últimos 6 meses">
          <MonthlyChart
            months={monthly.map((entry) => formatMonth(entry.month))}
            series={[
              {
                id: "properties",
                label: "Propiedades creadas",
                values: monthly.map((entry) => entry.properties),
                className: "bg-primary",
              },
              {
                id: "inquiries",
                label: "Consultas",
                values: monthly.map((entry) => entry.inquiries),
                className: "bg-foreground/60",
              },
              {
                id: "users",
                label: "Usuarios nuevos",
                values: monthly.map((entry) => entry.users),
                className: "bg-foreground/25",
              },
            ]}
          />
        </ReportCard>

        <div className="space-y-6">
          <ReportCard id="report-operation" title="Propiedades por operación">
            <BarList
              emptyText="Todavía no hay propiedades."
              items={properties.byOperation.map((entry) => ({
                id: entry.key,
                label: formatOperation(entry.key),
                value: entry.count,
              }))}
            />
          </ReportCard>
          <ReportCard id="report-visibility" title="Publicadas y borradores">
            <BarList
              emptyText="Todavía no hay propiedades."
              items={properties.byVisibility.map((entry) => ({
                id: entry.key,
                label: entry.key === "PUBLISHED" ? "Publicadas" : "Borradores",
                value: entry.count,
              }))}
            />
          </ReportCard>
        </div>

        <ReportCard id="report-type" title="Propiedades por tipo">
          <BarList
            emptyText="Todavía no hay propiedades."
            items={properties.byType.map((entry) => ({
              id: entry.key,
              label: formatPropertyType(entry.key),
              value: entry.count,
            }))}
          />
        </ReportCard>
        <ReportCard id="report-availability" title="Estado comercial">
          <BarList
            emptyText="Todavía no hay propiedades."
            items={properties.byAvailability.map((entry) => ({
              id: entry.key,
              label: formatAvailability(entry.key),
              value: entry.count,
            }))}
          />
        </ReportCard>

        <ReportCard id="report-cities" title="Ciudades con más propiedades">
          <BarList
            emptyText="Todavía no hay propiedades."
            items={properties.topCities.map((entry) => ({
              id: entry.key,
              label: entry.key,
              value: entry.count,
            }))}
          />
        </ReportCard>
        <ReportCard id="report-prices" title="Precio promedio (publicadas)">
          {properties.averagePrices.length === 0 ? (
            <p className="text-sm text-foreground/70">No hay propiedades publicadas.</p>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Precio promedio por operación y moneda</caption>
              <thead>
                <tr className="border-b border-foreground/15 text-left">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Operación
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Promedio
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Propiedades
                  </th>
                </tr>
              </thead>
              <tbody>
                {properties.averagePrices.map((entry) => (
                  <tr
                    key={`${entry.operation}-${entry.currency}`}
                    className="border-b border-foreground/10"
                  >
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      {formatOperation(entry.operation)} ({entry.currency})
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatAverage(entry.average, entry.currency)}
                      {entry.operation === "RENT" ? " / mes" : ""}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {numberFormatter.format(entry.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportCard>

        <ReportCard id="report-inquiries" title="Propiedades más consultadas">
          <TopPropertiesList
            items={inquiries.topProperties}
            singularUnit="consulta"
            pluralUnit="consultas"
            emptyText="Todavía no hay consultas."
          />
          <p className="mt-4 text-xs text-foreground/60">
            De usuarios registrados: {numberFormatter.format(inquiries.fromUsers)} · De visitantes:{" "}
            {numberFormatter.format(inquiries.fromVisitors)}
          </p>
        </ReportCard>
        <ReportCard id="report-favorites" title="Propiedades más guardadas">
          <TopPropertiesList
            items={favorites.topProperties}
            singularUnit="favorito"
            pluralUnit="favoritos"
            emptyText="Todavía no hay favoritos."
          />
        </ReportCard>

        <ReportCard id="report-users" title="Usuarios">
          <BarList
            emptyText="Todavía no hay usuarios."
            items={[
              { id: "active", label: "Activos", value: users.active },
              { id: "inactive", label: "Desactivados", value: users.inactive },
            ]}
          />
        </ReportCard>
      </div>

      <p className="mt-6 text-xs text-foreground/60">
        Datos generados el{" "}
        {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(
          new Date(data.generatedAt),
        )}{" "}
        · Las propiedades eliminadas no se cuentan.
      </p>
    </>
  );
}

/** Reportes y estadísticas del portal (solo ADMIN, spec §58). */
export function AdminReports() {
  const { data, error, mutate, isValidating } = useSWR(adminReportsUrl, fetchAdminReports, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader
        title="Reportes y estadísticas"
        description="Indicadores de propiedades, consultas, favoritos y usuarios."
        breadcrumbs={[{ label: "Administración", href: "/admin" }, { label: "Reportes" }]}
        actions={
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isValidating}
            className={`h-10 rounded-md border border-foreground/20 px-4 text-sm font-semibold hover:bg-foreground/5 disabled:opacity-60 ${focusClassName}`}
          >
            {isValidating && data !== undefined ? "Actualizando…" : "Actualizar"}
          </button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-4 text-sm"
        >
          <p>No pudimos cargar los reportes. Revisa tu conexión y vuelve a intentarlo.</p>
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isValidating}
            className={`rounded-md border border-foreground/20 px-4 py-2 font-semibold hover:bg-foreground/5 disabled:opacity-60 ${focusClassName}`}
          >
            {isValidating ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : data === undefined ? (
        <div aria-busy="true" className="mt-8">
          <p role="status" className="text-sm text-foreground/70">
            Cargando reportes…
          </p>
          <div aria-hidden="true" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl bg-foreground/10 motion-reduce:animate-none"
              />
            ))}
          </div>
        </div>
      ) : (
        <ReportsContent data={data} />
      )}
    </div>
  );
}

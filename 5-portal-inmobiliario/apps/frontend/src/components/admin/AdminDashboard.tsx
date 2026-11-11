"use client";

import type { ReactNode } from "react";
import useSWR from "swr";
import { adminDashboardUrl, fetchAdminDashboard } from "@portal/api-client";
import type { AdminDashboardDto } from "@portal/shared-types";
import { RecentPropertiesTable } from "./RecentPropertiesTable";

type Indicator = { key: keyof AdminDashboardDto; label: string; icon: ReactNode };

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "size-6",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const icons = {
  building: (
    <svg {...iconProps}>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 10h5a1 1 0 0 1 1 1v10M2 21h20M8 8h2M8 12h2M8 16h2" />
    </svg>
  ),
  check: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  ),
  tag: (
    <svg {...iconProps}>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  ),
  key: (
    <svg {...iconProps}>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M16 7l3 3" />
    </svg>
  ),
  users: (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </svg>
  ),
  mail: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
};

const groups: { id: string; title: string; indicators: Indicator[] }[] = [
  {
    id: "properties",
    title: "Propiedades",
    indicators: [
      { key: "totalProperties", label: "Total de propiedades", icon: icons.building },
      { key: "publishedProperties", label: "Propiedades publicadas", icon: icons.check },
      { key: "propertiesForSale", label: "Publicadas en venta", icon: icons.tag },
      { key: "propertiesForRent", label: "Publicadas en arriendo", icon: icons.key },
    ],
  },
  {
    id: "activity",
    title: "Actividad",
    indicators: [
      { key: "users", label: "Usuarios", icon: icons.users },
      { key: "inquiries", label: "Consultas", icon: icons.mail },
    ],
  },
];

const numberFormatter = new Intl.NumberFormat("es-MX");
const percentFormatter = new Intl.NumberFormat("es-MX", {
  style: "percent",
  maximumFractionDigits: 0,
});

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Panel de administración: indicadores generales del portal (solo ADMIN). */
export function AdminDashboard() {
  const { data, error, mutate, isValidating } = useSWR(adminDashboardUrl, fetchAdminDashboard, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const publishedShare =
    data && data.totalProperties > 0 ? data.publishedProperties / data.totalProperties : null;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-balance text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-foreground/70">Resumen general del portal.</p>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-4 text-sm"
        >
          <p>No pudimos cargar los indicadores. Revisa tu conexión y vuelve a intentarlo.</p>
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isValidating}
            className={`rounded-md border border-foreground/20 px-4 py-2 font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-60 ${focusClassName}`}
          >
            {isValidating ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : (
        <div aria-busy={data === undefined}>
          {data === undefined && (
            <p role="status" className="sr-only">
              Cargando indicadores…
            </p>
          )}
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`admin-${group.id}-title`} className="mt-8">
              <h2 id={`admin-${group.id}-title`} className="text-lg font-semibold">
                {group.title}
              </h2>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {group.indicators.map(({ key, label, icon }) => (
                  <div
                    key={key}
                    className="rounded-xl border border-foreground/10 bg-surface p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <dt className="min-w-0 text-sm font-medium text-foreground/70">{label}</dt>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-badge text-badge-foreground">
                        {icon}
                      </span>
                    </div>
                    <dd className="mt-3 text-3xl font-bold tabular-nums">
                      {data === undefined ? (
                        <span
                          aria-hidden="true"
                          className="inline-block h-9 w-16 animate-pulse rounded bg-foreground/10 motion-reduce:animate-none"
                        />
                      ) : (
                        numberFormatter.format(data[key])
                      )}
                    </dd>
                    {key === "publishedProperties" && publishedShare !== null && (
                      <div className="mt-3">
                        <div
                          role="img"
                          aria-label={`${percentFormatter.format(publishedShare)} de las propiedades están publicadas`}
                          className="h-2 overflow-hidden rounded-full bg-foreground/10"
                        >
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.round(publishedShare * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-foreground/60">
                          {percentFormatter.format(publishedShare)} del total
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      <RecentPropertiesTable />
    </div>
  );
}

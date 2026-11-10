"use client";

import Link from "next/link";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { ContactForm } from "./ContactForm";
import { PropertyGallery } from "./PropertyGallery";
import { PropertyMap } from "./PropertyMap";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePropertyDetail } from "@/hooks/usePropertyDetail";
import { formatArea, formatOperation, formatPrice, formatPropertyType } from "@/lib/format";

const containerClassName = "mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8";
const backLinkClassName =
  "text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function BackToCatalog() {
  return (
    <Link href="/properties" className={backLinkClassName}>
      ← Volver a propiedades
    </Link>
  );
}

function formatAge(age: number): string {
  if (age === 0) return "A estrenar";
  return `${age} ${age === 1 ? "año" : "años"}`;
}

type PropertyDetailProps = {
  propertyId: string;
};

export function PropertyDetail({ propertyId }: PropertyDetailProps) {
  const { property, isLoading, isNotFound, hasError, retry } = usePropertyDetail(propertyId);

  if (isLoading) {
    return (
      <div className={containerClassName} role="status" aria-label="Cargando propiedad">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 aspect-[16/9] w-full" />
        <Skeleton className="mt-6 h-9 w-2/3" />
        <Skeleton className="mt-3 h-6 w-1/3" />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className={containerClassName}>
        <div role="alert" className="rounded-lg border border-foreground/10 p-8 text-center">
          <h1 className="text-2xl font-bold">Propiedad no encontrada</h1>
          <p className="mt-2 text-foreground/70">
            La propiedad que buscas no existe o ya no está publicada.
          </p>
          <div className="mt-4">
            <BackToCatalog />
          </div>
        </div>
      </div>
    );
  }

  if (hasError || !property) {
    return (
      <div className={containerClassName}>
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 p-8 text-center"
        >
          <p className="font-medium">No pudimos cargar la propiedad.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const specifications: { label: string; value: string }[] = [
    { label: "Tipo", value: formatPropertyType(property.type) },
    property.usableArea !== null && {
      label: "Superficie útil",
      value: formatArea(property.usableArea),
    },
    property.totalArea !== null && {
      label: "Superficie total",
      value: formatArea(property.totalArea),
    },
    property.bedrooms !== null && {
      label: "Dormitorios",
      value: String(property.bedrooms),
    },
    property.bathrooms !== null && {
      label: "Baños",
      value: String(property.bathrooms),
    },
    property.parkingSpots !== null && {
      label: "Estacionamientos",
      value: String(property.parkingSpots),
    },
    property.age !== null && { label: "Antigüedad", value: formatAge(property.age) },
  ].filter((item): item is { label: string; value: string } => item !== false);

  return (
    <article className={containerClassName} aria-labelledby="property-title">
      <BackToCatalog />

      <div className="mt-6">
        <PropertyGallery
          images={property.images}
          propertyTitle={property.title}
          overlay={
            <span className="absolute left-4 top-4 rounded-full bg-badge px-3 py-1 text-sm font-semibold text-badge-foreground">
              {formatOperation(property.operation)}
            </span>
          }
        />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 id="property-title" className="break-words text-3xl font-bold tracking-tight">
              {property.title}
            </h1>
            <FavoriteButton propertyId={property.id} propertyTitle={property.title} />
          </div>
          <p className="mt-2 text-foreground/70">
            {property.address}, {property.commune}, {property.city}, {property.region}
          </p>

          <h2 className="mt-8 text-xl font-semibold">Descripción</h2>
          <p className="mt-2 whitespace-pre-line break-words text-foreground/90">
            {property.description}
          </p>

          {property.features.length > 0 && (
            <>
              <h2 className="mt-8 text-xl font-semibold">Características</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {property.features.map((feature) => (
                  <li
                    key={feature.id}
                    className="rounded-full border border-foreground/20 px-3 py-1 text-sm"
                  >
                    {feature.name}
                  </li>
                ))}
              </ul>
            </>
          )}

          <PropertyMap
            title={property.title}
            address={property.address}
            commune={property.commune}
            city={property.city}
            region={property.region}
          />
        </div>

        <div className="h-fit space-y-6">
          <aside
            aria-label="Resumen de la propiedad"
            className="rounded-xl border border-foreground/10 bg-surface p-6 shadow-sm"
          >
            <p className="text-3xl font-bold tabular-nums">
              {formatPrice(property.price, property.currency, property.operation)}
            </p>
            <dl className="mt-4 divide-y divide-foreground/10">
              {specifications.map((item) => (
                <div key={item.label} className="flex justify-between gap-4 py-2 text-sm">
                  <dt className="text-foreground/70">{item.label}</dt>
                  <dd className="font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
          <div className="rounded-xl border border-foreground/10 bg-surface p-6 shadow-sm [&>section]:mt-0">
            <ContactForm propertyId={property.id} propertyTitle={property.title} />
          </div>
        </div>
      </div>
    </article>
  );
}

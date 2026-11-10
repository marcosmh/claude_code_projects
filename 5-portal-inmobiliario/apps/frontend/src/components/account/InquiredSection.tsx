"use client";

import Link from "next/link";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyGrid } from "@/components/properties/PropertyGrid";
import { useInquiredProperties } from "@/hooks/useInquiredProperties";

/** «Propiedades consultadas»: las propiedades sobre las que la persona envió una consulta. */
export function InquiredSection() {
  const { properties } = useInquiredProperties();

  return (
    <section
      aria-labelledby="account-inquiries-title"
      className="rounded-xl border border-foreground/10 bg-surface p-6 shadow-sm"
    >
      <h2 id="account-inquiries-title" className="text-lg font-semibold">
        Propiedades consultadas
      </h2>
      {properties === undefined ? (
        <p role="status" className="mt-2 text-foreground/70">
          Cargando tus consultas…
        </p>
      ) : properties.length === 0 ? (
        <>
          <p className="mt-2 text-foreground/70">Aún no has consultado ninguna propiedad.</p>
          <Link
            href="/properties"
            className="mt-3 inline-block text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Explorar propiedades
          </Link>
        </>
      ) : (
        <PropertyGrid className="mt-4 md:grid-cols-2 lg:grid-cols-2">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} headingLevel="h3" />
          ))}
        </PropertyGrid>
      )}
    </section>
  );
}

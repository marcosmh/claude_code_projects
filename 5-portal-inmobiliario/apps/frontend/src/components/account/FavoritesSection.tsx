"use client";

import Link from "next/link";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyGrid } from "@/components/properties/PropertyGrid";
import { useFavorites } from "@/hooks/useFavorites";

/** «Propiedades interesadas»: las propiedades que la persona guardó como favoritas. */
export function FavoritesSection() {
  const { favorites } = useFavorites();

  return (
    <section
      aria-labelledby="account-interested-title"
      className="rounded-xl border border-foreground/10 bg-surface p-6 shadow-sm"
    >
      <h2 id="account-interested-title" className="text-lg font-semibold">
        Propiedades interesadas
      </h2>
      {favorites === undefined ? (
        <p role="status" className="mt-2 text-foreground/70">
          Cargando tus favoritos…
        </p>
      ) : favorites.length === 0 ? (
        <>
          <p className="mt-2 text-foreground/70">Aún no tienes propiedades guardadas.</p>
          <Link
            href="/properties"
            className="mt-3 inline-block text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Explorar propiedades
          </Link>
        </>
      ) : (
        <PropertyGrid className="mt-4 md:grid-cols-2 lg:grid-cols-2">
          {favorites.map((property) => (
            <PropertyCard key={property.id} property={property} headingLevel="h3" />
          ))}
        </PropertyGrid>
      )}
    </section>
  );
}

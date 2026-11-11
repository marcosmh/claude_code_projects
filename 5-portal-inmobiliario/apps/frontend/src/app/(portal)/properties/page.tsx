import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyCatalog } from "@/components/properties/PropertyCatalog";

export const metadata: Metadata = {
  title: "Propiedades | Portal Inmobiliario",
  description: "Explora las propiedades en venta y arriendo publicadas en México.",
};

export default function PropertiesPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
      <Suspense
        fallback={
          <p className="px-4 py-10 text-center text-foreground/70">Cargando propiedades…</p>
        }
      >
        <PropertyCatalog />
      </Suspense>
    </main>
  );
}

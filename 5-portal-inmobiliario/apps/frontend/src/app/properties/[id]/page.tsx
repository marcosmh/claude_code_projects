import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyDetail } from "@/components/properties/PropertyDetail";

export const metadata: Metadata = {
  title: "Detalle de propiedad | Portal Inmobiliario",
};

async function PropertyDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetail propertyId={id} />;
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="flex-1">
      <Suspense
        fallback={<p className="px-4 py-10 text-center text-foreground/70">Cargando propiedad…</p>}
      >
        <PropertyDetailRoute params={params} />
      </Suspense>
    </main>
  );
}

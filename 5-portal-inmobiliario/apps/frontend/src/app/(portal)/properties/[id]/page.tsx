import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyDetail } from "@/components/properties/PropertyDetail";
import { buildFallbackMetadata, buildPropertyMetadata } from "@/lib/seo";
import { loadPropertyForMetadata } from "@/lib/server-property";

/** Metadata dinámica: título, descripción, Open Graph e imagen principal de la propiedad. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = await loadPropertyForMetadata(id);
  return property ? buildPropertyMetadata(property) : buildFallbackMetadata();
}

async function PropertyDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PropertyDetail propertyId={id} />;
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
      <Suspense
        fallback={<p className="px-4 py-10 text-center text-foreground/70">Cargando propiedad…</p>}
      >
        <PropertyDetailRoute params={params} />
      </Suspense>
    </main>
  );
}

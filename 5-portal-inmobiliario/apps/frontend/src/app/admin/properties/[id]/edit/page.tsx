import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPropertyEditor } from "@/components/admin/AdminPropertyEditor";

export const metadata: Metadata = {
  title: "Editar propiedad | Administración",
  robots: { index: false },
};

async function EditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPropertyEditor propertyId={id} />;
}

export default function EditAdminPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-foreground/70">Cargando propiedad…</p>}>
      <EditRoute params={params} />
    </Suspense>
  );
}

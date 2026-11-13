import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPropertiesList } from "@/components/admin/AdminPropertiesList";

export const metadata: Metadata = {
  title: "Propiedades | Administración",
  robots: { index: false },
};

export default function AdminPropertiesPage() {
  // useSearchParams (página y filtros en la URL) exige un límite de Suspense.
  return (
    <Suspense>
      <AdminPropertiesList />
    </Suspense>
  );
}

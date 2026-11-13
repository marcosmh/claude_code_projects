import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminInquiriesList } from "@/components/admin/AdminInquiriesList";

export const metadata: Metadata = {
  title: "Consultas | Administración",
  robots: { index: false },
};

export default function AdminInquiriesPage() {
  // useSearchParams (página y filtros en la URL) exige un límite de Suspense.
  return (
    <Suspense>
      <AdminInquiriesList />
    </Suspense>
  );
}

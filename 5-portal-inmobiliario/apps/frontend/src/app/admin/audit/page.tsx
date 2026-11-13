import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminAuditList } from "@/components/admin/AdminAuditList";

export const metadata: Metadata = {
  title: "Auditoría | Administración",
  robots: { index: false },
};

export default function AdminAuditPage() {
  // useSearchParams (página y filtros en la URL) exige un límite de Suspense.
  return (
    <Suspense>
      <AdminAuditList />
    </Suspense>
  );
}

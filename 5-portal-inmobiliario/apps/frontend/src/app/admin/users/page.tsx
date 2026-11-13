import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminUsersList } from "@/components/admin/AdminUsersList";

export const metadata: Metadata = {
  title: "Usuarios | Administración",
  robots: { index: false },
};

export default function AdminUsersPage() {
  // useSearchParams (página y filtros en la URL) exige un límite de Suspense.
  return (
    <Suspense>
      <AdminUsersList />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { AdminUsersList } from "@/components/admin/AdminUsersList";

export const metadata: Metadata = {
  title: "Usuarios | Administración",
  robots: { index: false },
};

export default function AdminUsersPage() {
  return <AdminUsersList />;
}

import type { Metadata } from "next";
import { AdminUserForm } from "@/components/admin/AdminUserForm";

export const metadata: Metadata = {
  title: "Nuevo usuario | Administración",
  robots: { index: false },
};

export default function NewAdminUserPage() {
  return <AdminUserForm />;
}

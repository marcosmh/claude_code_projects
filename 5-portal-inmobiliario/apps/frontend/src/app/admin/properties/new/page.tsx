import type { Metadata } from "next";
import { AdminPropertyEditor } from "@/components/admin/AdminPropertyEditor";

export const metadata: Metadata = {
  title: "Nueva propiedad | Administración",
  robots: { index: false },
};

export default function NewAdminPropertyPage() {
  return <AdminPropertyEditor />;
}

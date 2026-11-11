import type { Metadata } from "next";
import { AdminPropertiesList } from "@/components/admin/AdminPropertiesList";

export const metadata: Metadata = {
  title: "Propiedades | Administración",
  robots: { index: false },
};

export default function AdminPropertiesPage() {
  return <AdminPropertiesList />;
}

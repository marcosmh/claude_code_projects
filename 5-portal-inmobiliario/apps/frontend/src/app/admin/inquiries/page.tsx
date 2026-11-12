import type { Metadata } from "next";
import { AdminInquiriesList } from "@/components/admin/AdminInquiriesList";

export const metadata: Metadata = {
  title: "Consultas | Administración",
  robots: { index: false },
};

export default function AdminInquiriesPage() {
  return <AdminInquiriesList />;
}

import type { Metadata } from "next";
import { AdminReports } from "@/components/admin/AdminReports";

export const metadata: Metadata = {
  title: "Reportes | Administración",
  robots: { index: false },
};

export default function AdminReportsPage() {
  return <AdminReports />;
}

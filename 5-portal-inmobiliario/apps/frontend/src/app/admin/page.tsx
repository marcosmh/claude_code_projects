import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Administración | Portal Inmobiliario",
  robots: { index: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}

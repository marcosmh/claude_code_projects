import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Administración | Portal Inmobiliario",
  robots: { index: false },
};

export default function AdminPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-12 focus:outline-none sm:px-6">
      <AdminDashboard />
    </main>
  );
}

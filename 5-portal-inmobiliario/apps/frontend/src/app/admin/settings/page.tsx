import type { Metadata } from "next";
import { SystemSettingsForm } from "@/components/admin/SystemSettingsForm";

export const metadata: Metadata = {
  title: "Configuración | Administración",
  robots: { index: false },
};

export default function AdminSettingsPage() {
  return <SystemSettingsForm />;
}

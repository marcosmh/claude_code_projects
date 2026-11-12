import type { Metadata } from "next";
import { AdminAuditList } from "@/components/admin/AdminAuditList";

export const metadata: Metadata = {
  title: "Auditoría | Administración",
  robots: { index: false },
};

export default function AdminAuditPage() {
  return <AdminAuditList />;
}

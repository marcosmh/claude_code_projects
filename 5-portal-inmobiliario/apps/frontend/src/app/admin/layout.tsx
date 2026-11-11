import type { ReactNode } from "react";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

/** Experiencia del administrador: layout propio, sin el header ni el pie del portal (spec §38). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<div className="admin-area min-h-screen bg-background" aria-hidden="true" />}
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

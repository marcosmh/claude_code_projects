import { NextResponse } from "next/server";
import { withRole } from "@/lib/http/with-role";
import { adminReportsService } from "@/services/services";

/** Reportes y estadísticas. Solo ADMIN (401 sin sesión, 403 para USER). */
export const GET = withRole("ADMIN", async () => {
  const reports = await adminReportsService.getReports();
  return NextResponse.json(reports, { headers: { "Cache-Control": "no-store" } });
});

import { NextResponse } from "next/server";
import { withRole } from "@/lib/http/with-role";
import { adminService } from "@/services/services";

/** Indicadores del panel de administración. Solo ADMIN (401 sin sesión, 403 para USER). */
export const GET = withRole("ADMIN", async () => {
  const indicators = await adminService.getDashboard();
  return NextResponse.json(indicators, { headers: { "Cache-Control": "no-store" } });
});

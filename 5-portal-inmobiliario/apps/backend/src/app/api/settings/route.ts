import { NextResponse } from "next/server";
import { systemSettingsService } from "@/services/services";

/** Configuración pública del portal. Sin secretos; no se cachea para ver los cambios al instante. */
export async function GET() {
  return NextResponse.json(await systemSettingsService.getSettings(), {
    headers: { "Cache-Control": "no-store" },
  });
}

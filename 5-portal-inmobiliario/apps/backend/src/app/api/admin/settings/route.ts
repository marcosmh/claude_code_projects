import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { systemSettingsService } from "@/services/services";
import { systemSettingsSchema } from "@portal/shared-types";

const noStore = { "Cache-Control": "no-store" };

/** Configuración del sistema. Solo ADMIN (401 sin sesión, 403 para USER). */
export const GET = withRole("ADMIN", async () =>
  NextResponse.json(await systemSettingsService.getSettings(), { headers: noStore }),
);

/** Reemplaza la configuración completa (400 con datos inválidos). */
export const PUT = withRole("ADMIN", async (request) => {
  const { data, response } = await parseJsonBody(
    request,
    systemSettingsSchema,
    "Configuración no válida",
  );
  if (response) return response;

  return NextResponse.json(await systemSettingsService.updateSettings(data), { headers: noStore });
});

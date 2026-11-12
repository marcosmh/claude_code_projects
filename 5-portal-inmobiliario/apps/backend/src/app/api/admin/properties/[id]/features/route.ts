import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { featureService } from "@/services/services";
import { setPropertyFeaturesInputSchema } from "@portal/shared-types";

/** Reemplaza las características de la propiedad; devuelve el conjunto resultante. */
export const PUT = withRole<{ id: string }>("ADMIN", async (request, { params }) => {
  const { id } = await params;
  const { data, response } = await parseJsonBody(
    request,
    setPropertyFeaturesInputSchema,
    "Datos de características no válidos",
  );
  if (response) return response;

  return NextResponse.json(await featureService.setPropertyFeatures(id, data.featureIds), {
    headers: { "Cache-Control": "no-store" },
  });
});
